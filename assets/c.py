import os
from PIL import Image, ImageOps

def is_numeric_webp(filename):
    """
    Проверяет, что файл имеет имя вида 'число.webp'
    """
    name, ext = os.path.splitext(filename)
    return ext.lower() == ".webp" and name.isdigit()

def create_gallery_thumbnails(root_dir, thumb_suffix="_thumb", size=(400, 300)):
    """
    Рекурсивно ищет *.webp с числовыми именами и создает миниатюры в формате 4:3 (400x300).
    """
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if is_numeric_webp(file):
                img_path = os.path.join(root, file)

                name, ext = os.path.splitext(file)
                thumb_filename = f"{name}{thumb_suffix}.webp"
                thumb_path = os.path.join(root, thumb_filename)

                try:
                    with Image.open(img_path) as img:
                        # Приводим к 4:3 с обрезкой
                        thumb = ImageOps.fit(img, size, Image.Resampling.LANCZOS)

                        # Сохраняем
                        thumb.save(thumb_path, "WEBP", quality=80)

                    print(f"Создано: {thumb_path}")

                except Exception as e:
                    print(f"Ошибка в {img_path}: {e}")

if __name__ == "__main__":
    create_gallery_thumbnails(".")
