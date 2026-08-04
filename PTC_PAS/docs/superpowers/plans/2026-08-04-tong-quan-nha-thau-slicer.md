# Tổng quan Nhà thầu Slicer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm bộ lọc Nhà thầu có thể gõ tìm kiếm trên trang `Tổng quan quyết toán`, bao phủ cả hai trường nhà thầu của các nguồn SharePoint đang được gộp.

**Architecture:** Tạo calculated column `Data[Nhà thầu chuẩn]` bằng cách ưu tiên `Data[NT/NCC/TV ]`, sau đó fallback sang `Data[TÊN NHÀ THẦU]`; giá trị rỗng sau `TRIM` trả về `BLANK()`. Thêm một slicer Dropdown ở rail trái, giữ nguyên style của các slicer hiện hữu và bật `general.selfFilterEnabled` để hỗ trợ nhập tìm kiếm.

**Tech Stack:** PBIP/PBIR JSON 2.11, TMDL, DAX, Python `unittest`, `powerbi-report-author`, `powerbi-desktop`.

## Global Constraints

- Chỉ sửa trang `Tổng quan quyết toán` và bảng model `Data`.
- Không thay đổi hoặc hoàn tác các chỉnh sửa đang có của người dùng.
- Không tạo nhánh; người dùng đã yêu cầu làm trực tiếp trên repository hiện tại.
- Không commit hoặc push nếu chưa được yêu cầu trong lượt này.

---

### Task 1: Khóa hành vi bằng kiểm thử

**Files:**
- Create: `_tools/test_contractor_slicer.py`
- Test: `_tools/test_contractor_slicer.py`

**Interfaces:**
- Consumes: `DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl` và PBIR trang `5bd3737f4bb0549b9e5c`.
- Produces: kiểm thử xác nhận calculated column, binding, dropdown, tìm kiếm và vị trí slicer.

- [ ] **Step 1: Viết kiểm thử thất bại**

Kiểm tra `Data[Nhà thầu chuẩn]` tham chiếu cả hai cột nguồn và visual `a100000000000000000c` bind đúng trường.

- [ ] **Step 2: Chạy kiểm thử để xác nhận RED**

Run: `python -m unittest -q _tools/test_contractor_slicer.py`

Expected: FAIL vì calculated column và visual chưa tồn tại.

### Task 2: Thêm model field và slicer

**Files:**
- Modify: `DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl`
- Create: `DASHBOARD TQT.Report/definition/pages/5bd3737f4bb0549b9e5c/visuals/a100000000000000000c/visual.json`

**Interfaces:**
- Consumes: `Data[NT/NCC/TV ]`, `Data[TÊN NHÀ THẦU]`.
- Produces: `Data[Nhà thầu chuẩn]` và slicer Dropdown tiêu đề `Nhà thầu`.

- [ ] **Step 1: Thêm calculated column tối thiểu**

```DAX
VAR _NhaThauChinh = TRIM ( COALESCE ( Data[NT/NCC/TV ], "" ) )
VAR _NhaThauPhu = TRIM ( COALESCE ( Data[TÊN NHÀ THẦU], "" ) )
RETURN COALESCE ( IF ( _NhaThauChinh <> "", _NhaThauChinh ), IF ( _NhaThauPhu <> "", _NhaThauPhu ) )
```

- [ ] **Step 2: Thêm slicer từ mẫu hiện hữu**

Sử dụng `visualType: slicer`, `data.mode: Dropdown`, `general.selfFilterEnabled: true`, vị trí `x=24`, `y=528`, `width=216`, `height=80`.

- [ ] **Step 3: Chạy kiểm thử để xác nhận GREEN**

Run: `python -m unittest -q _tools/test_contractor_slicer.py`

Expected: PASS.

### Task 3: Validate và kiểm tra hình ảnh

**Files:**
- Verify: `DASHBOARD TQT.Report`
- Verify: `DASHBOARD TQT.SemanticModel`

**Interfaces:**
- Consumes: PBIR/TMDL sau chỉnh sửa.
- Produces: kết quả validator và ảnh trang Tổng quan.

- [ ] **Step 1: Validate PBIR**

Run: `powerbi-report-author validate "DASHBOARD TQT.Report"`

Expected: không có error liên quan slicer mới.

- [ ] **Step 2: Mở PBIP và chụp trang**

Run: `powerbi-desktop open "DASHBOARD TQT.pbip"`, sau đó chụp page `5bd3737f4bb0549b9e5c`.

Expected: slicer `Nhà thầu` hiển thị ở rail trái, không chồng lấn, dropdown có tìm kiếm và lọc các visual trên trang.

- [ ] **Step 3: Kiểm tra diff phạm vi**

Run: `git diff -- Data.tmdl visual.json test_contractor_slicer.py`

Expected: chỉ có calculated column, slicer mới và kiểm thử tương ứng.

