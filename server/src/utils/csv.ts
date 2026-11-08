const DELIMITER = ",";
const QUOTE = '"';
const LINE_BREAK = "\n";

interface FieldRead {
  value: string;
  nextIndex: number;
}

export class CsvFormatter {
  format(
    headers: readonly string[],
    rows: ReadonlyArray<ReadonlyArray<string | number>>
  ): string {
    const lines = [this.formatRecord(headers)];
    for (const row of rows) {
      lines.push(this.formatRecord(row));
    }
    return lines.join(LINE_BREAK);
  }

  private formatRecord(values: ReadonlyArray<string | number>): string {
    return values.map((value) => this.escapeField(value)).join(DELIMITER);
  }

  private escapeField(value: string | number): string {
    const text = String(value);
    if (!this.needsQuoting(text)) {
      return text;
    }
    return `${QUOTE}${text.split(QUOTE).join(QUOTE + QUOTE)}${QUOTE}`;
  }

  private needsQuoting(text: string): boolean {
    return text.includes(DELIMITER) || text.includes(QUOTE) || text.includes(LINE_BREAK);
  }
}

export class CsvParser {
  parse(text: string): Record<string, string>[] {
    const records = this.parseRecords(this.normalizeLineEndings(text)).filter(
      (record) => !this.isBlankRecord(record)
    );
    if (records.length === 0) {
      return [];
    }

    const headers = this.readHeaders(records[0]);
    return records.slice(1).map((record) => this.toRow(headers, record));
  }

  private normalizeLineEndings(text: string): string {
    return text.replace(/\r\n/g, LINE_BREAK);
  }

  private parseRecords(text: string): string[][] {
    const records: string[][] = [];
    let record: string[] = [];
    let index = 0;

    while (index < text.length) {
      const { value, nextIndex } = this.readField(text, index);
      record.push(value);
      index = nextIndex;

      const separator = text[index];
      if (separator === DELIMITER) {
        index++;
        continue;
      }
      if (separator === LINE_BREAK) {
        records.push(record);
        record = [];
        index++;
        continue;
      }
      if (separator === undefined) {
        records.push(record);
        record = [];
      }
    }

    return records;
  }

  private readField(text: string, start: number): FieldRead {
    if (text[start] !== QUOTE) {
      return this.readPlainField(text, start);
    }
    return this.readQuotedField(text, start);
  }

  private readPlainField(text: string, start: number): FieldRead {
    let index = start;
    while (
      index < text.length &&
      text[index] !== DELIMITER &&
      text[index] !== LINE_BREAK
    ) {
      index++;
    }
    return { value: text.slice(start, index), nextIndex: index };
  }

  private readQuotedField(text: string, start: number): FieldRead {
    let value = "";
    let index = start + 1;

    while (index < text.length) {
      const char = text[index];
      if (char !== QUOTE) {
        value += char;
        index++;
        continue;
      }
      if (text[index + 1] === QUOTE) {
        value += QUOTE;
        index += 2;
        continue;
      }

      const tail = this.readPlainField(text, index + 1);
      return { value: value + tail.value, nextIndex: tail.nextIndex };
    }

    return { value, nextIndex: index };
  }

  private isBlankRecord(record: string[]): boolean {
    return record.length === 1 && record[0] === "";
  }

  private readHeaders(record: string[]): string[] {
    return record.map((header) => header.trim().toLowerCase());
  }

  private toRow(headers: string[], record: string[]): Record<string, string> {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (record[index] ?? "").trim();
    });
    return row;
  }
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return new CsvFormatter().format(headers, rows);
}

export function parseCsv(text: string): Record<string, string>[] {
  return new CsvParser().parse(text);
}
