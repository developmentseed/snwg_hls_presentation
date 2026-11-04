// Joins the 2x PNGs from `slidev export --format png --scale 2` into one PDF.
// Chromium print draws card box-shadows as grey blocks, so the PDF is built from screenshots.
// Usage: swift scripts/png2pdf.swift <png dir> <slide count> <out.pdf>
import PDFKit; import AppKit
let a = CommandLine.arguments  // dir, count, out
let doc = PDFDocument()
for i in 1...Int(a[2])! {
  let img = NSImage(contentsOfFile: "\(a[1])/\(i).png")!
  let rep = img.representations[0]
  img.size = NSSize(width: CGFloat(rep.pixelsWide)/2, height: CGFloat(rep.pixelsHigh)/2)
  doc.insert(PDFPage(image: img)!, at: doc.pageCount)
}
doc.write(to: URL(fileURLWithPath: a[3]))
print("pages", doc.pageCount)
