# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=11"]
# ///
"""Rectify the supplied reference photographs into current architectural materials."""
from pathlib import Path
from PIL import Image, ImageEnhance

source = Path("assets/environment/temple_references")
output = Path("tmp/imagecreate")
output.mkdir(parents=True, exist_ok=True)

# One complete flower field between its original frame edges. QUAD ordering is
# upper-left, lower-left, lower-right, upper-right in the source photograph.
beam = Image.open(source / "painted_canopy.png").convert("RGB")
beam = beam.transform(
    (1536, 512), Image.Transform.QUAD,
    (27, 479, 26, 532, 148, 567, 152, 515), Image.Resampling.BICUBIC,
)
ImageEnhance.Sharpness(beam).enhance(1.15).save(output / "temple_paint.png")

relief = Image.open(source / "suspended_sculpture.png").convert("RGB")
relief.crop((12, 48, 526, 690)).resize(
    (1024, 1536), Image.Resampling.LANCZOS,
).save(output / "temple_relief.png")
