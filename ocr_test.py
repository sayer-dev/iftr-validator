import pytesseract
from pdf2image import convert_from_path

PDF_PATH = r"D:\upload and scan and validate\test iftr 2.pdf"
TESSERACT_PATH = r"D:\ocr\tesseract.exe"

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

pages = convert_from_path(
    PDF_PATH,
    dpi=300,
    poppler_path=r"D:\poppler\poppler-26.02.0\Library\bin"
)

full_text = ""

for i, page in enumerate(pages, start=1):
    text = pytesseract.image_to_string(page, lang="eng")
    full_text += f"\n\n--- OCR PAGE {i} ---\n{text}"

print(full_text)