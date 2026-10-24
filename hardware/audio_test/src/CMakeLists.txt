idf_component_register(
  SRCS "main.c" "audio_io.c" "audio_metrics.c"
  INCLUDE_DIRS "."
  REQUIRES esp_driver_gpio esp_driver_i2s esp_driver_usb_serial_jtag esp_timer
)
