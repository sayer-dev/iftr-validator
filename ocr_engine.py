import sys
import pytesseract
from pdf2image import convert_from_path

TESSERACT_PATH = r"D:\ocr\tesseract.exe"
POPPLER_PATH = r"D:\poppler\poppler-26.02.0\Library\bin"

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

def ocr_pdf(pdf_path):
    pages = convert_from_path(
        pdf_path,
        dpi=400,
        poppler_path=POPPLER_PATH
    )

    full_text = ""

    for i, page in enumerate(pages, start=1):
        text = pytesseract.image_to_string(page, lang="eng")
        full_text += f"\n\n--- OCR PAGE {i} ---\n{text}"

    return full_text

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    result = ocr_pdf(pdf_path)
    print(result)