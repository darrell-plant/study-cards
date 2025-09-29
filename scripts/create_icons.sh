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