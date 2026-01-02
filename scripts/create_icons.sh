# 512×512
magick -size 512x512 xc:black \
  -gravity center -font "Hiragino-Sans-W6" -interline-spacing 20 \
  -define gradient:angle=45 \
  -fill "gradient:#FFBBFF-#8A2BE2" \
  -pointsize 200 -annotate +0-60 "勉強" \
  -pointsize 100 -annotate +0+120 "しよう" \
  icon-512.png

# 192×192
magick -size 192x192 xc:black \
  -gravity center -font "Hiragino-Sans-W6" -interline-spacing 10 \
  -define gradient:angle=45 \
  -fill "gradient:#FFBBFF-#8A2BE2" \
  -pointsize 72  -annotate +0-24 "勉強" \
  -pointsize 36  -annotate +0+48 "しよう" \
  icon-192.png

# favicons: make smaller PNGs
magick assets/icon-512.v3.png -resize 32x32 assets/icon-32.png
magick assets/icon-512.v3.png -resize 16x16 assets/icon-16.png

# optional but good for legacy browsers: multi-size .ico
magick assets/icon-512.v3.png -define icon:auto-resize=256,128,64,48,32,16 favicon.ico

# android-icon-512.png
magick icon-512.v3.png \
  -background black -gravity center -extent 768x768 \
  -resize 512x512 \
  android-icon-512.png