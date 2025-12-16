# Local latexmk config for this repo.
# Ensures PDF preview works sensibly on Linux/macOS without relying on MS-Windows defaults.

if ($^O eq 'linux') {
  $pdf_previewer = 'evince %O %S';
  $ps_previewer  = 'evince %O %S';
  $dvi_previewer = 'evince %O %S';
} elsif ($^O eq 'darwin') {
  $pdf_previewer = 'open %S';
  $ps_previewer  = 'open %S';
  $dvi_previewer = 'open %S';
}
