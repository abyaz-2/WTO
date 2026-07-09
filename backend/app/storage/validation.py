from __future__ import annotations

import os
from typing import Optional

ALLOWED_EXTENSIONS: set[str] = {
    ".pdf",
    ".docx",
    ".doc",
    ".jpg",
    ".jpeg",
    ".png",
    ".tiff",
    ".tif",
    ".txt",
    ".csv",
    ".xlsx",
    ".xls",
}

ALLOWED_MIME_TYPES: set[str] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "text/plain",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}

MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB

REJECTED_PATTERNS: list[str] = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".msi",
    ".scr",
    ".pif",
    ".vbs",
    ".vbe",
    ".js",
    ".jse",
    ".wsf",
    ".wsh",
    ".ps1",
    ".psm1",
    ".psd1",
    ".py",
    ".rb",
    ".php",
    ".asp",
    ".aspx",
    ".jsp",
    ".sh",
    ".bash",
    ".dll",
    ".sys",
    ".bin",
    ".hta",
    ".html",
    ".htm",
    ".svg",
]


def validate_file(filename: str, content_type: str, file_size: int) -> Optional[str]:
    if file_size > MAX_FILE_SIZE:
        return f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB"

    ext = os.path.splitext(filename)[1].lower()

    if not ext:
        return "File must have an extension"

    if ext in REJECTED_PATTERNS:
        return f"File extension '{ext}' is not allowed"

    if ext not in ALLOWED_EXTENSIONS:
        return f"File extension '{ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"

    if content_type not in ALLOWED_MIME_TYPES:
        return f"File type '{content_type}' is not allowed"

    if filename.count(".") > 1:
        return "Double extensions are not allowed"

    return None
