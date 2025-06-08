# Supported File Formats & Conversions

Tài liệu này mô tả tất cả các định dạng file được hỗ trợ và các loại chuyển đổi có thể thực hiện trong hệ thống.

## 📋 Tổng quan

Hệ thống hỗ trợ chuyển đổi giữa các định dạng file phổ biến với các công nghệ xử lý chuyên nghiệp:

- **Vector Graphics**: SVG, EPS
- **Raster Images**: PNG, JPG/JPEG
- **Documents**: PDF

## 🔄 Ma trận chuyển đổi được hỗ trợ

### SVG (Scalable Vector Graphics)

**Input Format**: `image/svg+xml`  
**File Extensions**: `.svg`  
**Max File Size**: 10MB

**Có thể chuyển đổi sang**:

- ✅ PNG (Portable Network Graphics)
- ✅ JPG/JPEG (JPEG Image)
- ✅ PDF (Portable Document Format)

**Có thể nhận từ**:

- ✅ EPS (Encapsulated PostScript)
- ✅ PNG (thông qua bitmap tracing)
- ✅ JPG/JPEG (thông qua bitmap tracing)

### PNG (Portable Network Graphics)

**Input Format**: `image/png`  
**File Extensions**: `.png`  
**Max File Size**: 50MB

**Có thể chuyển đổi sang**:

- ✅ SVG (thông qua bitmap tracing)
- ✅ JPG/JPEG
- ✅ JPEG

**Có thể nhận từ**:

- ✅ SVG
- ✅ EPS
- ✅ PDF

### JPG/JPEG (Joint Photographic Experts Group)

**Input Format**: `image/jpeg`, `image/jpg`  
**File Extensions**: `.jpg`, `.jpeg`  
**Max File Size**: 50MB

**Có thể chuyển đổi sang**:

- ✅ SVG (thông qua bitmap tracing)
- ✅ PNG

**Có thể nhận từ**:

- ✅ SVG
- ✅ PNG
- ✅ EPS
- ✅ PDF

### PDF (Portable Document Format)

**Input Format**: `application/pdf`  
**File Extensions**: `.pdf`  
**Max File Size**: 100MB

**Có thể chuyển đổi sang**:

- ✅ SVG (trang đầu tiên)
- ✅ PNG (trang đầu tiên)
- ✅ JPG/JPEG (trang đầu tiên)

**Có thể nhận từ**:

- ✅ SVG
- ✅ EPS

### EPS (Encapsulated PostScript)

**Input Format**: `application/postscript`, `image/x-eps`  
**File Extensions**: `.eps`, `.ps`  
**Max File Size**: 100MB

**Có thể chuyển đổi sang**:

- ✅ SVG
- ✅ PNG
- ✅ JPG/JPEG
- ✅ PDF

**Có thể nhận từ**:

- ❌ Không hỗ trợ chuyển đổi từ format khác sang EPS

## 🛠️ Công nghệ xử lý

### Vector to Raster Conversion

- **Primary Tool**: Sharp.js
- **Fallback Tool**: ImageMagick
- **Features**: Resize, quality control, density adjustment

### Raster to Vector Conversion (Bitmap Tracing)

- **Tool**: Potrace
- **Method**: Bitmap tracing algorithm
- **Options**: Threshold adjustment, color/monochrome

### EPS Processing

- **Tool**: Ghostscript
- **Capabilities**: Convert to SVG, PNG, JPG, PDF
- **Quality**: High-resolution output

### PDF Processing

- **SVG Conversion**: pdf2svg utility
- **Raster Conversion**: ImageMagick with density control
- **Page Selection**: Supports specific page conversion

### SVG Processing

- **Raster Output**: Sharp.js with SVG buffer processing
- **PDF Output**: ImageMagick with density optimization
- **Fallback**: ImageMagick for complex SVG files

## ⚙️ Tùy chọn chuyển đổi

### Chất lượng (Quality)

- **Áp dụng cho**: JPG/JPEG output
- **Phạm vi**: 10-100
- **Mặc định**: 90
- **Mô tả**: Chất lượng nén JPEG (cao hơn = chất lượng tốt hơn, file lớn hơn)

### Kích thước (Dimensions)

- **Width**: 1-10,000 pixels
- **Height**: 1-10,000 pixels
- **Behavior**: Maintain aspect ratio, fit inside specified dimensions
- **Note**: Không áp dụng cho PDF output

### Mật độ (Density)

- **Áp dụng cho**: PDF to raster conversions
- **Mặc định**: 300 DPI
- **Mô tả**: Độ phân giải đầu ra (DPI)

### Ngưỡng (Threshold)

- **Áp dụng cho**: Raster to SVG tracing
- **Phạm vi**: 0-255
- **Mặc định**: 128
- **Mô tả**: Ngưỡng nhị phân hóa cho bitmap tracing

### Trang PDF (Page Selection)

- **Áp dụng cho**: PDF conversions
- **Mặc định**: Trang 1
- **Mô tả**: Chọn trang cụ thể để chuyển đổi

## 🔒 Bảo mật & Giới hạn

### Kiểm tra File Type

- **Magic Number Validation**: Kiểm tra signature file thực tế
- **MIME Type Validation**: So sánh MIME type khai báo với thực tế
- **SVG Content Validation**: Kiểm tra nội dung SVG thực tế

### Giới hạn kích thước theo loại file

```
SVG:   10MB  - Tối ưu cho vector graphics
Image: 50MB  - PNG, JPG, JPEG
PDF:   100MB - Documents
EPS:   100MB - PostScript files
```

### Rate Limiting

- **Guest Users**: 5 conversions/hour
- **Registered Users**: 50 conversions/day
- **Premium Users**: 500 conversions/day
- **Admin**: Unlimited

## 📊 Thời gian xử lý ước tính

### Base Processing Time

```
Small files (<1MB):     5-10 seconds
Medium files (1-10MB):  10-30 seconds
Large files (10MB+):    30-120 seconds
```

### Complexity Modifiers

- **EPS conversions**: +50% thời gian
- **PDF output**: +20% thời gian
- **PDF input**: +30% thời gian
- **Bitmap tracing**: +40% thời gian

## 🚀 API Usage Examples

### Check Supported Formats

```http
GET /api/conversion/supported
```

### Convert File

```http
POST /api/conversion/convert
Content-Type: multipart/form-data

file: [binary file data]
targetFormat: PNG
quality: 90
width: 1920
height: 1080
```

### Conversion Status

```http
GET /api/conversion/status/{conversionId}
```

### Download Result

```http
GET /api/conversion/download/{conversionId}
```

## 🔧 Dependencies

### System Requirements

- **Node.js**: 20+
- **ImageMagick**: 7+
- **Ghostscript**: 9+
- **Potrace**: 1.16+
- **pdf2svg**: 0.2+

### Node.js Packages

- **sharp**: Vector và raster processing
- **potrace**: Bitmap tracing
- **file-type**: File validation
- **mime-types**: MIME type detection

## 🐛 Error Handling

### Common Error Cases

- **Invalid file format**: File không thuộc loại được hỗ trợ
- **File size exceeded**: Vượt quá giới hạn kích thước
- **Corrupted file**: File bị lỗi hoặc không đọc được
- **Conversion timeout**: Quá thời gian xử lý
- **Unsupported conversion**: Loại chuyển đổi không được hỗ trợ

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## 📝 Notes

1. **SVG Files**: Hệ thống tự động fallback sang ImageMagick nếu Sharp.js gặp lỗi với SVG phức tạp
2. **PDF Conversions**: Mặc định chỉ convert trang đầu tiên
3. **Bitmap Tracing**: Kết quả có thể khác nhau tùy thuộc vào complexity của hình ảnh gốc
4. **EPS Support**: Yêu cầu Ghostscript được cài đặt trên server
5. **Temporary Files**: Tất cả file tạm được tự động xóa sau khi xử lý

## 🔄 Future Enhancements

- [ ] WebP format support
- [ ] TIFF format support
- [ ] Multi-page PDF conversion
- [ ] SVG optimization options
- [ ] Advanced bitmap tracing settings
- [ ] Batch conversion API
- [ ] Custom color palettes for tracing
