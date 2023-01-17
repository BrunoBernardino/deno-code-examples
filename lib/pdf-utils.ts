import {
  degrees,
  PDFDocument,
  PDFField,
  PDFPageDrawTextOptions,
  rgb,
  StandardFonts,
} from 'https://cdn.skypack.dev/pdf-lib@1.17.1?dts';
import { FontStyle } from './types.ts';

interface AddTextToFormOptions {
  text: string;
  x: number;
  y: number;
  isAbsolute?: boolean;
  size?: number;
  color?: {
    red: number;
    green: number;
    blue: number;
  };
  rotation?: number;
  pageIndex?: number;
  fontStyle?: FontStyle;
}

export async function addTextToForm(
  existingPdfBytes: string | ArrayBuffer | Uint8Array,
  {
    text,
    x,
    y,
    isAbsolute,
    size = 9,
    color = { red: 0, green: 0, blue: 0 },
    rotation,
    pageIndex = 0,
    fontStyle,
  }: AddTextToFormOptions,
) {
  const pdfDocument = await PDFDocument.load(existingPdfBytes);

  // Draw some text on the first page of the PDFDocument
  const page = pdfDocument.getPage(pageIndex);

  const textOptions: PDFPageDrawTextOptions = {
    x,
    y: y + (isAbsolute ? 0 : (page.getHeight() / 2)),
    size,
    color: rgb(color.red, color.green, color.blue),
    rotate: degrees(rotation || 0),
  };

  if (fontStyle) {
    let standardFont = StandardFonts.TimesRoman;
    switch (fontStyle) {
      case 'courier':
        standardFont = StandardFonts.Courier;
        break;
      case 'helvetica_italic':
        standardFont = StandardFonts.HelveticaOblique;
        break;
      case 'helvetica':
        standardFont = StandardFonts.Helvetica;
        break;
    }

    const font = await pdfDocument.embedFont(standardFont);
    textOptions.font = font;
  }

  page.drawText(text, textOptions);

  const pdfBytes = await pdfDocument.save();

  return pdfBytes;
}

type PdfFieldType =
  | 'PDFButton'
  | 'PDFCheckBox'
  | 'PDFDropdown'
  | 'PDFOptionList'
  | 'PDFRadioGroup'
  | 'PDFSignature'
  | 'PDFTextField';

// Useful for finding coordinates and fields in a given form (development)
export async function showPdfFormFields(formFilePath: string) {
  const existingPdfBytes = await Deno.readFile(`${Deno.cwd()}/public/forms/${formFilePath}`);
  const pdfDocument = await PDFDocument.load(existingPdfBytes);

  const form = pdfDocument.getForm();
  const fields = form.getFields();

  fields.forEach((field) => {
    const pdfFieldType = field.constructor.name as PdfFieldType;

    const name = field.getName();
    console.log(`${pdfFieldType}: ${name}`);
    console.log(getRectanglesFromField(field, pdfDocument));
  });
}

function getRectanglesFromField(field: PDFField, pdfDocument: PDFDocument) {
  const widgets = field.acroField.getWidgets();

  if (pdfDocument) {
    return widgets.map((widget) => {
      const rectangle: { x: number; y: number; width: number; height: number; pageIndex?: number } = widget
        .getRectangle();
      const pageIndex = pdfDocument
        .getPages()
        .findIndex((page) => page.ref == widget.P());
      rectangle.pageIndex = pageIndex;
      return rectangle;
    });
  }

  return widgets.map((widget) => widget.getRectangle());
}
