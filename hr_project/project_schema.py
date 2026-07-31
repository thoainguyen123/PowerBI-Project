"""Schema migrations shared by the app and project-data import tools."""


def _quote_identifier(name):
    return '"' + str(name).replace('"', '""') + '"'


def _quote_qualified_identifier(name):
    return '.'.join(_quote_identifier(part) for part in str(name).split('.'))


def _sqlite_has_unique_project_code(connection):
    for index in connection.execute('PRAGMA index_list(projects)').fetchall():
        index_name = index['name'] if hasattr(index, 'keys') else index[1]
        is_unique = index['unique'] if hasattr(index, 'keys') else index[2]
        if not is_unique:
            continue
        columns = connection.execute(
            f'PRAGMA index_info({_quote_identifier(index_name)})'
        ).fetchall()
        column_names = [
            row['name'] if hasattr(row, 'keys') else row[2]
            for row in columns
        ]
        if column_names == ['ma_du_an']:
            return True
    return False


def ensure_sqlite_project_id(connection):
    """Make projects.id the SQLite PK and keep ma_du_an as a unique business key."""
    table_info = connection.execute('PRAGMA table_info(projects)').fetchall()
    if not table_info:
        return False

    columns = [dict(row) for row in table_info]
    id_column = next((column for column in columns if column['name'] == 'id'), None)
    code_column = next(
        (column for column in columns if column['name'] == 'ma_du_an'), None
    )
    if code_column is None:
        raise ValueError('Bảng projects thiếu cột ma_du_an.')
    if id_column and id_column['pk'] == 1 and _sqlite_has_unique_project_code(connection):
        return False

    invalid_codes = connection.execute('''
        SELECT COUNT(*) AS total
        FROM projects
        WHERE ma_du_an IS NULL OR TRIM(ma_du_an) = ''
    ''').fetchone()[0]
    duplicate_code = connection.execute('''
        SELECT ma_du_an
        FROM projects
        GROUP BY ma_du_an
        HAVING COUNT(*) > 1
        LIMIT 1
    ''').fetchone()
    if invalid_codes or duplicate_code:
        raise ValueError(
            'Không thể tạo UNIQUE cho ma_du_an vì dữ liệu đang trống hoặc trùng.'
        )

    dependent_objects = connection.execute('''
        SELECT type, name, sql
        FROM sqlite_master
        WHERE tbl_name = 'projects'
          AND type IN ('index', 'trigger')
          AND sql IS NOT NULL
    ''').fetchall()
    existing_id_names = [column['name'] for column in columns if column['name'] != 'id']
    column_definitions = [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'ma_du_an TEXT NOT NULL UNIQUE',
    ]
    for column in columns:
        name = column['name']
        if name in {'id', 'ma_du_an'}:
            continue
        definition = _quote_identifier(name)
        if column['type']:
            definition += f" {column['type']}"
        if column['notnull']:
            definition += ' NOT NULL'
        if column['dflt_value'] is not None:
            definition += f" DEFAULT {column['dflt_value']}"
        column_definitions.append(definition)

    foreign_keys_enabled = connection.execute('PRAGMA foreign_keys').fetchone()[0]
    if foreign_keys_enabled:
        connection.commit()
        connection.execute('PRAGMA foreign_keys = OFF')
    try:
        connection.execute('DROP TABLE IF EXISTS projects__id_migration')
        connection.execute(
            'CREATE TABLE projects__id_migration ('
            + ', '.join(column_definitions)
            + ')'
        )
        quoted_columns = ', '.join(_quote_identifier(name) for name in existing_id_names)
        connection.execute(
            f'INSERT INTO projects__id_migration ({quoted_columns}) '
            f'SELECT {quoted_columns} FROM projects ORDER BY rowid'
        )
        connection.execute('DROP TABLE projects')
        connection.execute('ALTER TABLE projects__id_migration RENAME TO projects')
        for obj in dependent_objects:
            sql = obj['sql'] if hasattr(obj, 'keys') else obj[2]
            connection.execute(sql)
        if foreign_keys_enabled:
            connection.commit()
    finally:
        if foreign_keys_enabled:
            connection.execute('PRAGMA foreign_keys = ON')
    return True


def ensure_postgres_project_id(cursor):
    """Make projects.id the PostgreSQL PK and ma_du_an a unique business key."""
    cursor.execute('''
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'projects'
    ''')
    columns = {row['column_name'] for row in cursor.fetchall()}
    if 'id' not in columns:
        cursor.execute('ALTER TABLE projects ADD COLUMN id BIGSERIAL')

    cursor.execute('ALTER TABLE projects ALTER COLUMN id SET NOT NULL')
    cursor.execute('ALTER TABLE projects ALTER COLUMN ma_du_an SET NOT NULL')
    cursor.execute('''
        SELECT c.conname, array_agg(a.attname ORDER BY u.ordinality) AS columns
        FROM pg_constraint c
        JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality)
          ON TRUE
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = u.attnum
        WHERE c.conrelid = 'projects'::regclass AND c.contype IN ('p', 'u')
        GROUP BY c.conname, c.contype
    ''')
    constraints = {
        row['conname']: list(row['columns'])
        for row in cursor.fetchall()
    }
    if ['ma_du_an'] not in constraints.values():
        cursor.execute(
            'ALTER TABLE projects ADD CONSTRAINT projects_ma_du_an_key UNIQUE (ma_du_an)'
        )

    cursor.execute('''
        SELECT c.conname, array_agg(a.attname ORDER BY u.ordinality) AS columns
        FROM pg_constraint c
        JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality)
          ON TRUE
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = u.attnum
        WHERE c.conrelid = 'projects'::regclass AND c.contype = 'p'
        GROUP BY c.conname
    ''')
    primary_key = cursor.fetchone()
    if primary_key and list(primary_key['columns']) == ['id']:
        return False

    cursor.execute('''
        SELECT c.conrelid::regclass::text AS table_name,
               c.conname,
               pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c
        WHERE c.contype = 'f' AND c.confrelid = 'projects'::regclass
    ''')
    foreign_keys = [dict(row) for row in cursor.fetchall()]
    for foreign_key in foreign_keys:
        cursor.execute(
            f'ALTER TABLE {_quote_qualified_identifier(foreign_key["table_name"])} '
            f'DROP CONSTRAINT {_quote_identifier(foreign_key["conname"])}'
        )
    if primary_key:
        cursor.execute(
            f'ALTER TABLE projects DROP CONSTRAINT '
            f'{_quote_identifier(primary_key["conname"])}'
        )
    cursor.execute('ALTER TABLE projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id)')
    for foreign_key in foreign_keys:
        cursor.execute(
            f'ALTER TABLE {_quote_qualified_identifier(foreign_key["table_name"])} '
            f'ADD CONSTRAINT {_quote_identifier(foreign_key["conname"])} '
            f'{foreign_key["definition"]}'
        )
    return True
