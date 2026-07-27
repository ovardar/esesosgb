const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'nacecodes.csv');
const outputPath = path.join(__dirname, 'src', 'data', 'naceCodes.ts');

const content = fs.readFileSync(csvPath, 'utf-8');

function parseCSV(text) {
  const result = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(field.trim());
      if (row.length > 1 && row[0] !== 'nace_code') {
        result.push(row);
      }
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.length > 1 && row[0] !== 'nace_code') {
      result.push(row);
    }
  }
  return result;
}

console.log('Parsing CSV...');
const rows = parseCSV(content);
console.log('Parsed raw rows:', rows.length);

const naceMap = new Map();

rows.forEach((r) => {
  const code = (r[0] || '').trim();
  let desc = (r[1] || '').trim();
  let danger = (r[2] || '').trim();

  desc = desc.replace(/^"+|"+$/g, '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ');

  if (danger.includes('Çok') || danger.includes('Cok')) {
    danger = 'Çok Tehlikeli';
  } else if (danger.includes('Tehlikeli')) {
    danger = 'Tehlikeli';
  } else if (danger.includes('Az')) {
    danger = 'Az Tehlikeli';
  }

  if (code && desc) {
    if (!naceMap.has(code)) {
      naceMap.set(code, {
        nace_code: code,
        description: desc,
        danger_class: danger || 'Az Tehlikeli'
      });
    }
  }
});

const uniqueList = Array.from(naceMap.values());
console.log('Unique NACE entries extracted:', uniqueList.length);

const fileHeader = `export type NaceItem = {
  nace_code: string;
  description: string;
  danger_class: 'Az Tehlikeli' | 'Tehlikeli' | 'Çok Tehlikeli' | string;
};

export const comprehensiveNaceList: NaceItem[] = ${JSON.stringify(uniqueList, null, 2)};

export function searchNaceCodes(query: string): NaceItem[] {
  const normalized = query.trim().toLocaleLowerCase('tr-TR');
  if (!normalized) return [];

  const cleanDigits = normalized.replace(/[\\.\\s]/g, '');

  return comprehensiveNaceList.filter((item) => {
    const itemCodeDigits = item.nace_code.replace(/[\\.\\s]/g, '');
    const codeMatch = itemCodeDigits.includes(cleanDigits) || item.nace_code.toLocaleLowerCase('tr-TR').includes(normalized);
    const descMatch = item.description.toLocaleLowerCase('tr-TR').includes(normalized);
    return codeMatch || descMatch;
  }).slice(0, 15);
}
`;

fs.writeFileSync(outputPath, fileHeader, 'utf-8');
console.log('Successfully written full NACE database from CSV to src/data/naceCodes.ts!');
