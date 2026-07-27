from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / "tmp" / "pdfs"
OUT = ROOT / "output" / "pdf"
PDF_PATH = OUT / "Huong_dan_Thong_tin_du_an_va_Master_data_du_an.pdf"

FONT_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_SEMIBOLD = Path(r"C:\Windows\Fonts\seguisb.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")

NAVY = "#102038"
INK = "#172033"
MUTED = "#627287"
TEAL = "#0D9488"
TEAL_DARK = "#087F74"
BLUE = "#3B82F6"
AMBER = "#F59E0B"
GREEN = "#10B981"
BG = "#EEF3F8"
CARD = "#FFFFFF"
BORDER = "#DDE6EE"
SOFT_TEAL = "#E9F8F6"
SOFT_BLUE = "#EDF5FF"
SOFT_AMBER = "#FFF6E6"


def font(size, bold=False, semibold=False):
    path = FONT_BOLD if bold else FONT_SEMIBOLD if semibold else FONT_REGULAR
    return ImageFont.truetype(str(path), size)


def rounded(draw, box, radius=18, fill=CARD, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, size=24, color=INK, bold=False, semibold=False, anchor=None):
    draw.text(xy, value, font=font(size, bold=bold, semibold=semibold), fill=color, anchor=anchor)


def wrap_text(draw, value, max_width, size=22, bold=False, semibold=False):
    words = value.split()
    lines, current = [], ""
    f = font(size, bold=bold, semibold=semibold)
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=f)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(draw, xy, value, max_width, size=22, color=MUTED, line_gap=6, bold=False, semibold=False):
    x, y = xy
    for line in wrap_text(draw, value, max_width, size, bold=bold, semibold=semibold):
        text(draw, (x, y), line, size=size, color=color, bold=bold, semibold=semibold)
        y += size + line_gap
    return y


def button(draw, box, label, primary=False):
    fill = NAVY if primary else "#F8FAFC"
    outline = NAVY if primary else "#CBD7E2"
    fg = "#FFFFFF" if primary else NAVY
    rounded(draw, box, radius=11, fill=fill, outline=outline, width=2)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2), label, 20, fg, semibold=True, anchor="mm")


def callout(draw, number, point, bubble):
    px, py = point
    bx, by = bubble
    draw.line((bx, by, px, py), fill="#E53935", width=5)
    draw.ellipse((bx - 23, by - 23, bx + 23, by + 23), fill="#E53935", outline="#FFFFFF", width=4)
    text(draw, (bx, by - 1), str(number), 23, "#FFFFFF", bold=True, anchor="mm")


def sidebar(draw, active):
    draw.rounded_rectangle((18, 18, 220, 882), radius=24, fill=NAVY)
    draw.ellipse((43, 42, 87, 86), fill=TEAL)
    text(draw, (65, 64), "N", 24, "#FFFFFF", bold=True, anchor="mm")
    text(draw, (102, 45), "NVL Data Hub", 24, "#FFFFFF", bold=True)
    text(draw, (102, 75), "Operations Data Portal", 13, "#A8B8C9")
    items = [
        ("Thông tin dự án", "projects"),
        ("Master data dự án", "master"),
        ("Phân bổ dự án", "alloc"),
        ("Nhân sự chung", "common"),
        ("Hồ sơ & đánh giá", "profile"),
        ("Cấu hình phòng ban", "config"),
        ("Xuất & đồng bộ", "export"),
    ]
    y = 140
    for label, key in items:
        is_active = key == active
        if is_active:
            rounded(draw, (34, y - 8, 204, y + 42), radius=10, fill="#173853")
            draw.rectangle((34, y - 8, 39, y + 42), fill=TEAL)
        draw.ellipse((48, y + 5, 60, y + 17), fill=TEAL if is_active else "#7890A7")
        text(draw, (72, y), label, 17, "#FFFFFF" if is_active else "#BDCAD6", semibold=is_active)
        y += 62


def topbar(draw, kicker, title):
    rounded(draw, (238, 18, 1582, 92), radius=20, fill="#FFFFFF", outline=BORDER, width=1)
    text(draw, (270, 34), kicker.upper(), 13, TEAL_DARK, semibold=True)
    text(draw, (270, 54), title, 25, INK, bold=True)
    rounded(draw, (1360, 37, 1552, 74), radius=18, fill=SOFT_TEAL, outline="#C9ECE7", width=1)
    draw.ellipse((1380, 50, 1393, 63), fill=GREEN)
    text(draw, (1405, 47), "Hệ thống trực tuyến", 15, TEAL_DARK, semibold=True)


def hero(draw, eyebrow, title_value, subtitle, buttons):
    rounded(draw, (250, 112, 1568, 245), radius=24, fill="#114D78")
    text(draw, (282, 137), eyebrow, 15, "#4CE0CF", bold=True)
    text(draw, (282, 167), title_value, 34, "#FFFFFF", bold=True)
    text(draw, (282, 211), subtitle, 17, "#DCEAF5")
    x2 = 1536
    for label, primary in reversed(buttons):
        width = 180 if len(label) < 15 else 230
        button(draw, (x2 - width, 158, x2, 207), label, primary=primary)
        x2 -= width + 16


def stat_card(draw, box, value, label, accent, soft):
    x1, y1, x2, y2 = box
    rounded(draw, box, radius=18, fill=CARD, outline=BORDER, width=1)
    draw.rounded_rectangle((x1, y1, x1 + 6, y2), radius=3, fill=accent)
    rounded(draw, (x1 + 22, y1 + 22, x1 + 67, y1 + 67), radius=12, fill=soft)
    draw.ellipse((x1 + 38, y1 + 38, x1 + 51, y1 + 51), fill=accent)
    text(draw, (x1 + 85, y1 + 18), value, 30, INK, bold=True)
    text(draw, (x1 + 85, y1 + 54), label, 14, MUTED, semibold=True)


def screenshot_project_overview(path):
    img = Image.new("RGB", (1600, 900), BG)
    d = ImageDraw.Draw(img)
    sidebar(d, "projects")
    topbar(d, "Danh mục dự án", "Thông tin dự án")
    hero(
        d,
        "DANH MỤC DỰ ÁN",
        "Thông tin dự án",
        "Quản lý thông tin tổng quan và hồ sơ cơ bản của từng dự án.",
        [("Xuất Excel", False), ("Thêm dự án", True)],
    )
    cards = [
        ((250, 264, 560, 350), "126", "Tổng dự án / phân khu", NAVY, "#EFF3F7"),
        ((578, 264, 888, 350), "98", "Đủ thông tin", GREEN, "#EAF9F2"),
        ((906, 264, 1216, 350), "28", "Cần bổ sung", AMBER, SOFT_AMBER),
        ((1234, 264, 1568, 350), "8", "Khu vực quản lý", BLUE, SOFT_BLUE),
    ]
    for args in cards:
        stat_card(d, *args)
    rounded(d, (250, 372, 1568, 440), radius=16, fill=CARD, outline=BORDER)
    rounded(d, (272, 388, 795, 425), radius=10, fill="#F6F9FC", outline=BORDER)
    text(d, (290, 397), "Tìm mã, tên dự án, chủ đầu tư, địa điểm...", 16, "#8A99AA")
    for x, label in [(970, "Tất cả khu vực"), (1160, "Tất cả hiện trạng"), (1370, "Chất lượng dữ liệu")]:
        rounded(d, (x, 388, min(x + 180, 1544), 425), radius=10, fill="#FFFFFF", outline=BORDER)
        text(d, (x + 14, 397), label, 14, MUTED)
    rounded(d, (250, 462, 1568, 852), radius=18, fill=CARD, outline=BORDER)
    text(d, (278, 486), "Danh mục thông tin dự án", 22, INK, bold=True)
    text(d, (278, 518), "Đang hiển thị 126 dự án", 14, MUTED)
    cols = ["Mã dự án", "Dự án", "Khu vực", "Hiện trạng", "Chủ đầu tư", "Quy mô", "Chất lượng", "Thao tác"]
    widths = [150, 230, 130, 165, 215, 150, 150, 95]
    x = 270
    for label, width in zip(cols, widths):
        text(d, (x, 564), label, 14, MUTED, semibold=True)
        x += width
    d.line((270, 592, 1548, 592), fill=BORDER, width=2)
    rows = [
        ["HCM.AQUA.01", "Aqua Riverside", "TP.HCM 1", "Đang triển khai", "NVL Land", "42.5 ha", "Đủ thông tin", "✎"],
        ["DNA.PKT.02", "Đảo 2", "Đồng Nai", "Đang nghiên cứu", "Nova Group", "18.2 ha", "Cần bổ sung", "✎"],
        ["HCM.CHC.01", "City Center", "TP.HCM 2", "Đang triển khai", "NVL Land", "31.0 ha", "Đủ thông tin", "✎"],
    ]
    y = 615
    for row_index, row in enumerate(rows):
        x = 270
        for value, width in zip(row, widths):
            color = TEAL_DARK if value == "Đủ thông tin" else AMBER if value == "Cần bổ sung" else INK
            text(d, (x, y), value, 14, color, semibold=value in ("Đủ thông tin", "Cần bổ sung"))
            x += width
        d.line((270, y + 37, 1548, y + 37), fill="#EBF0F4", width=1)
        y += 67
    callout(d, 1, (120, 163), (230, 142))
    callout(d, 2, (1455, 181), (1518, 265))
    callout(d, 3, (1200, 305), (1270, 250))
    callout(d, 4, (565, 408), (690, 455))
    callout(d, 5, (1488, 650), (1530, 720))
    img.save(path, quality=95)


def labeled_field(draw, box, label, value="", required=False, multiline=False):
    x1, y1, x2, y2 = box
    text(draw, (x1, y1 - 27), f"{label}{' *' if required else ''}", 16, INK, semibold=True)
    rounded(draw, box, radius=9, fill="#FFFFFF", outline="#CEDAE5", width=2)
    if value:
        text(draw, (x1 + 15, y1 + 13), value, 16, "#37465A")


def screenshot_project_modal(path):
    img = Image.new("RGB", (1600, 900), "#D9E0E8")
    d = ImageDraw.Draw(img)
    sidebar(d, "projects")
    topbar(d, "Danh mục dự án", "Thông tin dự án")
    rounded(d, (260, 45, 1500, 860), radius=24, fill="#FFFFFF", outline="#C8D5E1", width=2)
    text(d, (300, 78), "MASTER DATA DỰ ÁN", 15, TEAL_DARK, bold=True)
    text(d, (300, 108), "Thêm thông tin dự án", 30, INK, bold=True)
    d.line((285, 153, 1475, 153), fill=BORDER, width=2)
    text(d, (300, 184), "1. Thông tin quản lý", 21, INK, bold=True)
    field_w = 360
    xs = [300, 700, 1100]
    labeled_field(d, (xs[0], 245, xs[0] + field_w, 295), "Mã dự án", "HCM.AQUA.01", True)
    labeled_field(d, (xs[1], 245, xs[1] + field_w, 295), "Tên dự án trong danh mục", "Aqua Riverside", True)
    labeled_field(d, (xs[2], 245, xs[2] + field_w, 295), "Khu vực", "TP.HCM 1", True)
    labeled_field(d, (xs[0], 355, xs[0] + field_w, 405), "Hiện trạng đầu tư", "Đang triển khai")
    labeled_field(d, (xs[1], 355, xs[1] + field_w, 405), "Nhóm dự án", "Nhà ở")
    labeled_field(d, (xs[2], 355, xs[2] + field_w, 405), "Quản lý khu vực / Ban điều hành", "Ban điều hành miền Nam")
    text(d, (300, 455), "2. Thông tin tổng quan dự án", 21, INK, bold=True)
    labeled_field(d, (xs[0], 515, xs[0] + field_w, 565), "Tên pháp lý dự án", "Khu đô thị Aqua Riverside")
    labeled_field(d, (xs[1], 515, xs[1] + field_w, 565), "Tên thương mại", "Aqua Riverside")
    labeled_field(d, (xs[2], 515, xs[2] + field_w, 565), "Chủ đầu tư", "NVL Land")
    labeled_field(d, (xs[0], 625, xs[0] + field_w, 675), "Nguồn gốc dự án", "Tự phát triển")
    labeled_field(d, (xs[1], 625, xs[1] + field_w, 675), "Tổng diện tích (ha)", "42.5")
    labeled_field(d, (xs[2], 625, xs[2] + field_w, 675), "Số lượng sản phẩm", "1,250")
    labeled_field(d, (xs[0], 735, xs[2] + field_w, 790), "Địa điểm dự án", "TP. Thủ Đức, TP.HCM")
    button(d, (1185, 811, 1458, 854), "Lưu dự án", primary=True)
    button(d, (1025, 811, 1168, 854), "Hủy", primary=False)
    callout(d, 1, (435, 265), (255, 245))
    callout(d, 2, (835, 375), (800, 445))
    callout(d, 3, (1250, 650), (1500, 620))
    callout(d, 4, (1320, 832), (1505, 805))
    img.save(path, quality=95)


def screenshot_master_overview(path):
    img = Image.new("RGB", (1600, 900), BG)
    d = ImageDraw.Draw(img)
    sidebar(d, "master")
    topbar(d, "Dữ liệu master data", "Master data dự án")
    hero(
        d,
        "DỮ LIỆU PHÒNG BAN",
        "Master data dự án",
        "Cập nhật thông tin HRC, FAC, PLP, DMD, PCD... theo từng dự án.",
        [("Xuất Excel 16 sheet", False), ("Xuất CSV tổng hợp", True)],
    )
    rounded(d, (250, 263, 1568, 346), radius=18, fill=CARD, outline=BORDER)
    text(d, (280, 280), "Dự án đang nhập liệu", 14, MUTED, semibold=True)
    rounded(d, (280, 306, 750, 334), radius=8, fill="#FFFFFF", outline="#C9D6E1")
    text(d, (294, 310), "HCM.AQUA.01 - Aqua Riverside", 15, INK)
    for x, value, label in [(1000, "18", "bản ghi"), (1190, "6/15", "sheet có dữ liệu"), (1390, "9", "sheet chưa nhập")]:
        text(d, (x, 286), value, 22, TEAL_DARK, bold=True)
        text(d, (x, 315), label, 13, MUTED)
    rounded(d, (250, 365, 560, 852), radius=18, fill=CARD, outline=BORDER)
    text(d, (280, 390), "NHÓM DỮ LIỆU", 14, MUTED, bold=True)
    modules = [
        ("9.1 HRC", "Nhân sự", True, "3"),
        ("9.2 FAC", "Thông báo tín dụng", False, "2"),
        ("9.3 SAC", "Bán hàng", False, "4"),
        ("9.4 MAC", "Sale kit / Sự kiện", False, "1"),
        ("4.1 PLP", "Pháp lý", False, "5"),
        ("4.2 DMD", "Thiết kế", False, "2"),
        ("4.3 PCD", "Thi công", False, "1"),
    ]
    y = 430
    for code, label, active, count in modules:
        if active:
            rounded(d, (267, y - 8, 542, y + 48), radius=10, fill=SOFT_TEAL)
            d.rectangle((267, y - 8, 272, y + 48), fill=TEAL)
        text(d, (286, y), code, 16, TEAL_DARK if active else INK, bold=active)
        text(d, (286, y + 22), label, 13, MUTED)
        rounded(d, (500, y + 3, 530, y + 31), radius=13, fill="#FFFFFF", outline=BORDER)
        text(d, (515, y + 17), count, 13, TEAL_DARK, semibold=True, anchor="mm")
        y += 59
    rounded(d, (580, 365, 1568, 852), radius=18, fill=CARD, outline=BORDER)
    text(d, (612, 394), "9.1 HRC · Nhân sự", 22, INK, bold=True)
    text(d, (612, 426), "Theo dõi định biên, nhân sự hiện hữu và nhu cầu tuyển dụng.", 14, MUTED)
    button(d, (1375, 388, 1538, 434), "Thêm dòng", primary=True)
    headers = ["Mã dự án", "Tổng định biên", "Đang làm việc", "Sẽ tuyển dụng", "Chi tiết", "Ghi chú"]
    widths = [155, 155, 155, 155, 185, 135]
    x = 610
    for h, w in zip(headers, widths):
        text(d, (x, 480), h, 13, MUTED, semibold=True)
        x += w
    d.line((610, 508, 1538, 508), fill=BORDER, width=2)
    rows = [
        ["HCM.AQUA.01", "38", "31", "7", "Định biên Q3", "Đã duyệt"],
        ["HCM.AQUA.01", "42", "34", "8", "Dự kiến Q4", "Chờ duyệt"],
    ]
    y = 535
    for row in rows:
        x = 610
        for value, w in zip(row, widths):
            text(d, (x, y), value, 14, INK)
            x += w
        d.line((610, y + 38, 1538, y + 38), fill="#EBF0F4", width=1)
        y += 70
    callout(d, 1, (1260, 182), (1515, 245))
    callout(d, 2, (500, 319), (780, 335))
    callout(d, 3, (400, 455), (580, 520))
    callout(d, 4, (1450, 410), (1518, 485))
    callout(d, 5, (1050, 550), (1110, 700))
    img.save(path, quality=95)


def screenshot_master_modal(path):
    img = Image.new("RGB", (1600, 900), "#D9E0E8")
    d = ImageDraw.Draw(img)
    sidebar(d, "master")
    topbar(d, "Dữ liệu master data", "Master data dự án")
    rounded(d, (330, 90, 1470, 830), radius=24, fill="#FFFFFF", outline="#C8D5E1", width=2)
    text(d, (375, 124), "MASTER DATA", 15, TEAL_DARK, bold=True)
    text(d, (375, 156), "Thêm dòng dữ liệu", 30, INK, bold=True)
    d.line((360, 200, 1440, 200), fill=BORDER, width=2)
    rounded(d, (375, 224, 1425, 282), radius=12, fill=SOFT_TEAL, outline="#C7ECE7")
    text(d, (400, 242), "Dự án: HCM.AQUA.01 - Aqua Riverside", 17, TEAL_DARK, semibold=True)
    text(d, (1010, 242), "Sheet: HRC - Nhân sự", 17, TEAL_DARK, semibold=True)
    labeled_field(d, (375, 350, 850, 405), "Mã dự án", "HCM.AQUA.01", True)
    labeled_field(d, (925, 350, 1400, 405), "Tổng nhân sự theo định biên", "38")
    labeled_field(d, (375, 480, 850, 535), "Đang làm việc", "31")
    labeled_field(d, (925, 480, 1400, 535), "Sẽ tuyển dụng", "7")
    labeled_field(d, (375, 610, 850, 665), "Chi tiết", "Định biên được duyệt Q3/2026")
    labeled_field(d, (925, 610, 1400, 665), "Ghi chú", "Theo kế hoạch tuyển dụng")
    button(d, (1160, 750, 1405, 798), "Lưu dữ liệu", primary=True)
    button(d, (995, 750, 1140, 798), "Hủy", primary=False)
    callout(d, 1, (730, 253), (315, 270))
    callout(d, 2, (1145, 375), (1475, 360))
    callout(d, 3, (610, 505), (310, 530))
    callout(d, 4, (1280, 774), (1470, 740))
    img.save(path, quality=95)


def register_pdf_fonts():
    pdfmetrics.registerFont(TTFont("Segoe", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("Segoe-Semibold", str(FONT_SEMIBOLD)))
    pdfmetrics.registerFont(TTFont("Segoe-Bold", str(FONT_BOLD)))


def pdf_text(c, x, y, value, size=10, color=INK, font_name="Segoe"):
    c.setFillColor(HexColor(color))
    c.setFont(font_name, size)
    c.drawString(x, y, value)


def pdf_wrapped(c, x, y, value, width_chars=86, size=9.5, leading=13, color=MUTED, font_name="Segoe"):
    for line in wrap(value, width=width_chars):
        pdf_text(c, x, y, line, size, color, font_name)
        y -= leading
    return y


def page_header(c, section, page_no):
    w, h = A4
    c.setFillColor(HexColor(NAVY))
    c.rect(0, h - 34, w, 34, fill=1, stroke=0)
    pdf_text(c, 38, h - 22, "NVL DATA HUB", 8.5, "#55D9CB", "Segoe-Bold")
    pdf_text(c, 115, h - 22, section, 8.5, "#FFFFFF", "Segoe-Semibold")
    pdf_text(c, w - 67, h - 22, f"TRANG {page_no:02d}", 8.5, "#C7D3DF", "Segoe-Semibold")


def page_footer(c):
    w, _ = A4
    c.setStrokeColor(HexColor(BORDER))
    c.line(38, 32, w - 38, 32)
    pdf_text(c, 38, 18, "Hướng dẫn sử dụng nội bộ - Thông tin dự án & Master data dự án", 7.5, MUTED)
    pdf_text(c, w - 131, 18, "Phiên bản 1.0 - 07/2026", 7.5, MUTED)


def title_block(c, title_value, subtitle, y=774):
    pdf_text(c, 38, y, title_value, 21, NAVY, "Segoe-Bold")
    pdf_wrapped(c, 38, y - 24, subtitle, width_chars=95, size=9.5, leading=13, color=MUTED)


def draw_image_panel(c, image_path, x=38, y=360, width=519, height=292):
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(HexColor(BORDER))
    c.roundRect(x - 3, y - 3, width + 6, height + 6, 9, fill=1, stroke=1)
    c.drawImage(ImageReader(str(image_path)), x, y, width=width, height=height, preserveAspectRatio=True, mask="auto")


def numbered_item(c, number, title_value, body, x, y, width_chars=74):
    c.setFillColor(HexColor(TEAL))
    c.circle(x + 10, y - 2, 10, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Segoe-Bold", 9)
    c.drawCentredString(x + 10, y - 5, str(number))
    pdf_text(c, x + 28, y + 1, title_value, 10.5, INK, "Segoe-Bold")
    return pdf_wrapped(c, x + 28, y - 15, body, width_chars=width_chars, size=8.8, leading=12, color=MUTED)


def draw_cover(c):
    w, h = A4
    c.setFillColor(HexColor(NAVY))
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(HexColor("#173853"))
    c.circle(w + 30, h - 120, 190, fill=1, stroke=0)
    c.setFillColor(HexColor(TEAL))
    c.circle(w - 45, h - 85, 92, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.roundRect(42, h - 175, 63, 63, 16, fill=1, stroke=0)
    pdf_text(c, 59, h - 154, "NVL", 14, TEAL_DARK, "Segoe-Bold")
    pdf_text(c, 42, h - 225, "HƯỚNG DẪN SỬ DỤNG", 10, "#55D9CB", "Segoe-Bold")
    pdf_text(c, 42, h - 272, "Thông tin dự án", 29, "#FFFFFF", "Segoe-Bold")
    pdf_text(c, 42, h - 310, "& Master data dự án", 29, "#FFFFFF", "Segoe-Bold")
    pdf_wrapped(
        c,
        42,
        h - 350,
        "Tài liệu thao tác nhanh dành cho người nhập liệu và quản lý dữ liệu dự án trên NVL Data Hub.",
        width_chars=62,
        size=11,
        leading=16,
        color="#C8D5E2",
    )
    c.setFillColor(HexColor("#173853"))
    c.roundRect(42, 120, w - 84, 145, 18, fill=1, stroke=0)
    pdf_text(c, 65, 228, "NỘI DUNG", 9, "#55D9CB", "Segoe-Bold")
    pdf_text(c, 65, 198, "01  Quản lý danh mục và hồ sơ dự án", 11, "#FFFFFF", "Segoe-Semibold")
    pdf_text(c, 65, 169, "02  Nhập liệu theo 15 nhóm master data", 11, "#FFFFFF", "Segoe-Semibold")
    pdf_text(c, 65, 140, "03  Xuất Excel 16 sheet và CSV tổng hợp", 11, "#FFFFFF", "Segoe-Semibold")
    pdf_text(c, 42, 55, "PHÒNG / BAN: ______________________________", 8.5, "#AABCCC")
    pdf_text(c, w - 175, 55, "Phiên bản 1.0 - 07/2026", 8.5, "#AABCCC")
    c.showPage()


def build_pdf(images):
    register_pdf_fonts()
    c = canvas.Canvas(str(PDF_PATH), pagesize=A4)
    c.setTitle("Hướng dẫn Thông tin dự án và Master data dự án")
    c.setAuthor("NVL Data Hub")
    draw_cover(c)

    page_header(c, "LUỒNG THAO TÁC", 2)
    title_block(c, "Luồng nhập liệu khuyến nghị", "Thực hiện theo thứ tự để mã dự án và dữ liệu master luôn đồng bộ.")
    flow_y = 610
    flow = [
        ("1", "Tạo dự án", "Khai báo mã, khu vực và thông tin tổng quan."),
        ("2", "Chọn dự án", "Mở tab Master data và chọn đúng dự án."),
        ("3", "Nhập từng sheet", "Chọn HRC, FAC, PLP... rồi thêm dòng."),
        ("4", "Kiểm tra KPI", "Đối chiếu số sheet đã có và còn thiếu."),
        ("5", "Xuất dữ liệu", "Tải Excel 16 sheet hoặc CSV tổng hợp."),
    ]
    x = 44
    for idx, (num, label, body) in enumerate(flow):
        c.setFillColor(HexColor(SOFT_TEAL if idx < 4 else SOFT_AMBER))
        c.setStrokeColor(HexColor("#C9E8E3" if idx < 4 else "#F4D9A5"))
        c.roundRect(x, flow_y, 94, 118, 12, fill=1, stroke=1)
        c.setFillColor(HexColor(TEAL if idx < 4 else AMBER))
        c.circle(x + 18, flow_y + 95, 11, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Segoe-Bold", 9)
        c.drawCentredString(x + 18, flow_y + 92, num)
        pdf_text(c, x + 12, flow_y + 67, label, 9.3, INK, "Segoe-Bold")
        pdf_wrapped(c, x + 12, flow_y + 50, body, width_chars=18, size=7.6, leading=10, color=MUTED)
        if idx < len(flow) - 1:
            pdf_text(c, x + 98, flow_y + 54, ">", 16, TEAL, "Segoe-Bold")
        x += 103
    c.setFillColor(HexColor("#F8FAFC"))
    c.setStrokeColor(HexColor(BORDER))
    c.roundRect(38, 390, 519, 215, 14, fill=1, stroke=1)
    pdf_text(c, 58, 568, "Nguyên tắc dữ liệu cần nhớ", 13, NAVY, "Segoe-Bold")
    rules = [
        "Mã dự án là khóa liên kết giữa Thông tin dự án và toàn bộ sheet master.",
        "Tạo dự án trước, sau đó mới nhập master data.",
        "Chọn đúng dự án và đúng sheet trước khi bấm Thêm dòng.",
        "Không đổi mã dự án sau khi đã phát sinh dữ liệu master.",
        "Xuất file để kiểm tra định kỳ và lưu bản đối soát.",
    ]
    y = 538
    for rule in rules:
        c.setFillColor(HexColor(TEAL))
        c.circle(60, y + 3, 3, fill=1, stroke=0)
        pdf_text(c, 72, y, rule, 9.2, INK, "Segoe")
        y -= 31
    c.setFillColor(HexColor(SOFT_AMBER))
    c.setStrokeColor(HexColor("#F4D9A5"))
    c.roundRect(38, 250, 519, 105, 14, fill=1, stroke=1)
    pdf_text(c, 58, 322, "Trước khi bắt đầu", 11.5, "#9A5B00", "Segoe-Bold")
    pdf_wrapped(c, 58, 299, "Chuẩn bị mã dự án, tên pháp lý, khu vực, chủ đầu tư, diện tích, số lượng sản phẩm và người chịu trách nhiệm xác nhận dữ liệu.", 84, 9, 13, "#795114")
    page_footer(c)
    c.showPage()

    page_header(c, "THÔNG TIN DỰ ÁN", 3)
    title_block(c, "1. Quản lý danh mục dự án", "Trang này dùng để tạo, tìm kiếm, kiểm tra chất lượng và xuất danh sách thông tin tổng quan dự án.")
    draw_image_panel(c, images["project_overview"], y=392)
    y = 357
    y = numbered_item(c, 1, "Mở tab Thông tin dự án", "Chọn mục trong menu bên trái.", 38, y)
    y = numbered_item(c, 2, "Thêm hoặc xuất dự án", "Bấm Thêm dự án để khai báo mới; bấm Xuất Excel để tải sheet Tổng quan dự án.", 38, y - 8)
    y = numbered_item(c, 3, "Theo dõi chất lượng dữ liệu", "KPI cho biết tổng số dự án, số dự án đủ thông tin, số cần bổ sung và số khu vực.", 38, y - 8)
    y = numbered_item(c, 4, "Tìm kiếm và lọc", "Có thể lọc theo khu vực, hiện trạng đầu tư và chất lượng dữ liệu.", 38, y - 8)
    numbered_item(c, 5, "Chỉnh sửa dự án", "Bấm biểu tượng bút chì ở cột Thao tác để cập nhật hồ sơ.", 38, y - 8)
    page_footer(c)
    c.showPage()

    page_header(c, "THÔNG TIN DỰ ÁN", 4)
    title_block(c, "2. Thêm hoặc cập nhật dự án", "Các trường có dấu * là bắt buộc. Nên hoàn thiện cả phần thông tin quản lý và thông tin tổng quan.")
    draw_image_panel(c, images["project_modal"], y=386)
    y = 351
    y = numbered_item(c, 1, "Nhập mã dự án", "Mã phải duy nhất và thống nhất với mã dùng trong file nguồn.", 38, y)
    y = numbered_item(c, 2, "Chọn hiện trạng và đơn vị quản lý", "Thông tin này hỗ trợ lọc, phân quyền và theo dõi tiến độ dự án.", 38, y - 7)
    y = numbered_item(c, 3, "Hoàn thiện quy mô dự án", "Nhập tên pháp lý, tên thương mại, chủ đầu tư, nguồn gốc, diện tích và số lượng sản phẩm.", 38, y - 7)
    numbered_item(c, 4, "Lưu dự án", "Sau khi lưu thành công, dự án sẽ xuất hiện trong danh mục và danh sách chọn của Master data.", 38, y - 7)
    c.setFillColor(HexColor(SOFT_AMBER))
    c.setStrokeColor(HexColor("#F2D49C"))
    c.roundRect(38, 78, 519, 58, 10, fill=1, stroke=1)
    pdf_text(c, 52, 112, "Lưu ý:", 9, "#935B00", "Segoe-Bold")
    pdf_text(c, 91, 112, "Không tạo hai mã khác nhau cho cùng một dự án.", 9, "#6E501A", "Segoe")
    pdf_text(c, 52, 93, "Khi chỉnh sửa, mã dự án được khóa để bảo toàn liên kết master data.", 8.7, "#6E501A", "Segoe")
    page_footer(c)
    c.showPage()

    page_header(c, "MASTER DATA DỰ ÁN", 5)
    title_block(c, "3. Chọn dự án và nhóm dữ liệu", "Mỗi dự án có 15 nhóm master data. Chỉ nhập sau khi đã chọn đúng dự án và đúng sheet.")
    draw_image_panel(c, images["master_overview"], y=392)
    y = 357
    y = numbered_item(c, 1, "Xuất dữ liệu", "Excel gồm sheet Tổng quan dự án và 15 sheet master; CSV là bảng tổng hợp dạng fact.", 38, y)
    y = numbered_item(c, 2, "Chọn dự án", "KPI bên phải tự cập nhật số bản ghi, sheet đã có dữ liệu và sheet còn thiếu.", 38, y - 8)
    y = numbered_item(c, 3, "Chọn nhóm dữ liệu", "Danh sách bên trái gồm HRC, FAC, SAC, MAC, PTC, QSB, SEC, IDD, CSC, PMD, PLP, DMD, PCD và OM.", 38, y - 8)
    y = numbered_item(c, 4, "Thêm dòng", "Nút chỉ hoạt động sau khi đã chọn dự án.", 38, y - 8)
    numbered_item(c, 5, "Kiểm tra bảng", "Mỗi dòng hiển thị theo schema riêng của sheet đang chọn.", 38, y - 8)
    page_footer(c)
    c.showPage()

    page_header(c, "MASTER DATA DỰ ÁN", 6)
    title_block(c, "4. Thêm hoặc cập nhật dòng master data", "Biểu mẫu thay đổi theo từng sheet. Ví dụ dưới đây là HRC - Nhân sự.")
    draw_image_panel(c, images["master_modal"], y=386)
    y = 351
    y = numbered_item(c, 1, "Kiểm tra ngữ cảnh", "Xác nhận đúng dự án và đúng sheet trước khi nhập.", 38, y)
    y = numbered_item(c, 2, "Nhập định biên", "Ghi tổng nhân sự theo định biên đã được phê duyệt.", 38, y - 8)
    y = numbered_item(c, 3, "Đối chiếu nhân sự", "Thông thường: Đang làm việc + Sẽ tuyển dụng = Tổng định biên.", 38, y - 8)
    numbered_item(c, 4, "Lưu dữ liệu", "Sau khi lưu, bảng và KPI master data sẽ được cập nhật.", 38, y - 8)
    c.setFillColor(HexColor("#F8FAFC"))
    c.setStrokeColor(HexColor(BORDER))
    c.roundRect(38, 64, 519, 76, 10, fill=1, stroke=1)
    pdf_text(c, 52, 116, "Quy tắc nhập liệu", 10, NAVY, "Segoe-Bold")
    pdf_text(c, 52, 96, "• Dùng cùng đơn vị đo trong một sheet.  • Ngày theo định dạng YYYY-MM-DD.", 8.6, MUTED, "Segoe")
    pdf_text(c, 52, 79, "• Ghi rõ nguồn hoặc kỳ dữ liệu trong Chi tiết/Ghi chú để dễ đối soát.", 8.6, MUTED, "Segoe")
    page_footer(c)
    c.showPage()

    page_header(c, "XUẤT DỮ LIỆU & KIỂM TRA", 7)
    title_block(c, "5. Xuất file và kiểm tra trước khi gửi", "Thực hiện checklist dưới đây để tránh thiếu sheet, sai dự án hoặc số liệu chưa cân.")
    cards = [
        ("Excel 16 sheet", "Dùng khi cần bàn giao đầy đủ: 1 sheet Tổng quan dự án + 15 sheet master.", TEAL, SOFT_TEAL),
        ("CSV tổng hợp", "Dùng cho Power BI, Power Query hoặc kiểm tra dữ liệu dạng bảng dài.", BLUE, SOFT_BLUE),
    ]
    x = 38
    for title_value, body, accent, soft in cards:
        c.setFillColor(HexColor(soft))
        c.setStrokeColor(HexColor(BORDER))
        c.roundRect(x, 598, 250, 115, 14, fill=1, stroke=1)
        c.setFillColor(HexColor(accent))
        c.circle(x + 26, 681, 11, fill=1, stroke=0)
        pdf_text(c, x + 46, 675, title_value, 11, INK, "Segoe-Bold")
        pdf_wrapped(c, x + 18, 648, body, width_chars=43, size=8.7, leading=12, color=MUTED)
        x += 269
    pdf_text(c, 38, 555, "Checklist bàn giao", 14, NAVY, "Segoe-Bold")
    checks = [
        "Đúng dự án và đúng mã dự án.",
        "Thông tin tổng quan đã đủ tên pháp lý, chủ đầu tư, địa điểm và quy mô.",
        "KPI sheet có dữ liệu / sheet chưa nhập đã được kiểm tra.",
        "Các phép cân số liệu hợp lý, ví dụ định biên = đang làm việc + sẽ tuyển.",
        "Các ngày và phần trăm dùng cùng định dạng.",
        "Chi tiết và ghi chú nêu rõ kỳ dữ liệu hoặc nguồn xác nhận.",
        "Mở thử file Excel sau khi tải và kiểm tra đủ 16 sheet.",
    ]
    y = 520
    for item in checks:
        c.setStrokeColor(HexColor("#AFC0CF"))
        c.roundRect(42, y - 2, 12, 12, 2, fill=0, stroke=1)
        pdf_text(c, 68, y, item, 9.3, INK, "Segoe")
        y -= 35
    c.setFillColor(HexColor(SOFT_AMBER))
    c.setStrokeColor(HexColor("#F2D49C"))
    c.roundRect(38, 150, 519, 105, 14, fill=1, stroke=1)
    pdf_text(c, 56, 222, "Khi gặp lỗi", 11.5, "#945B00", "Segoe-Bold")
    pdf_text(c, 56, 198, "Không thấy dự án:", 9, "#6E501A", "Segoe-Bold")
    pdf_text(c, 147, 198, "quay lại Thông tin dự án và kiểm tra dự án đã được lưu.", 9, "#6E501A")
    pdf_text(c, 56, 178, "Nút Thêm dòng bị khóa:", 9, "#6E501A", "Segoe-Bold")
    pdf_text(c, 177, 178, "chọn dự án trong thanh phía trên.", 9, "#6E501A")
    pdf_text(c, 56, 158, "File xuất thiếu dữ liệu:", 9, "#6E501A", "Segoe-Bold")
    pdf_text(c, 168, 158, "kiểm tra bộ lọc dự án và số sheet chưa nhập.", 9, "#6E501A")
    page_footer(c)
    c.showPage()
    c.save()

    reader = PdfReader(str(PDF_PATH))
    if len(reader.pages) != 7:
        raise RuntimeError(f"Expected 7 pages, found {len(reader.pages)}")
    return PDF_PATH


def main():
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    images = {
        "project_overview": TMP / "guide_project_overview.png",
        "project_modal": TMP / "guide_project_modal.png",
        "master_overview": TMP / "guide_master_overview.png",
        "master_modal": TMP / "guide_master_modal.png",
    }
    screenshot_project_overview(images["project_overview"])
    screenshot_project_modal(images["project_modal"])
    screenshot_master_overview(images["master_overview"])
    screenshot_master_modal(images["master_modal"])
    pdf_path = build_pdf(images)
    print(pdf_path)


if __name__ == "__main__":
    main()
