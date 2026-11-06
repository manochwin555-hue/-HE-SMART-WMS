import { ShelfLevel, StorageZone } from '../types';

export interface ResolvedLocator {
  zone: StorageZone;
  bayNumber: number;
  level: ShelfLevel;
  palletPosition?: 'P1' | 'P2' | string;
  canonicalLocator: string;
  displayLocation: string;
}

/**
 * Maps any input coordinates or raw locator code to a strictly normalized 1:1 Canonical Locator.
 * Correctly maps CY3 DY3T-1.01..1.04 to CY3-A..D without fallback shift.
 */
export function resolveCanonicalCoordinate(params: {
  zone?: StorageZone | string;
  bayNumber?: number;
  level?: ShelfLevel | number;
  palletPosition?: string;
  locatorCode?: string;
}): ResolvedLocator {
  let { zone = 'B', bayNumber = 1, level = 1, palletPosition, locatorCode } = params;

  let cleanCode = locatorCode ? locatorCode.trim().toUpperCase() : '';
  let cleanZone = String(zone).trim().toUpperCase();
  let numBay = Math.max(1, Number(bayNumber) || 1);
  let numLevel = (Math.max(1, Math.min(4, Number(level) || 1))) as ShelfLevel;
  let posSuffix = palletPosition ? palletPosition.trim().toUpperCase() : '';

  let extractedGroup: string | null = null;
  let extractedRow: number | null = null;
  let extractedCol: number | null = null;

  // Extract from full locator string if provided
  if (cleanCode) {
    // 1. CY3 Outdoor Racks: DY3T-1.01-A01-L1-P1 or DY3T-1.03-C05-L2-P2
    const cy3Match = cleanCode.match(/DY3T-1\.0([1-4])-(?:([A-D]))?0*(\d+)-L([1-4])(?:-P([12]))?/i);
    if (cy3Match) {
      const rowDigit = cy3Match[1];
      const rowLetter = rowDigit === '1' ? 'A' : rowDigit === '2' ? 'B' : rowDigit === '3' ? 'C' : 'D';
      cleanZone = `CY3-${rowLetter}`;
      numBay = parseInt(cy3Match[3], 10);
      numLevel = parseInt(cy3Match[4], 10) as ShelfLevel;
      if (cy3Match[5]) posSuffix = `P${cy3Match[5]}`;
    }

    // 2. A4 Selective Rack: DA4D-2-B01-L4-P2 or DA4D-3-G01-L1-P1
    const a4RackMatch = cleanCode.match(/DA4D-[23]-([B-K])0*(\d+)-L([1-4])(?:-P([12]))?/i);
    if (a4RackMatch) {
      cleanZone = a4RackMatch[1];
      numBay = parseInt(a4RackMatch[2], 10);
      numLevel = parseInt(a4RackMatch[3], 10) as ShelfLevel;
      if (a4RackMatch[4]) posSuffix = `P${a4RackMatch[4]}`;
    }

    // 3. A4 Floor Staging: DA4D-1.01-X2-07 or DA4D-1.01-X3-R2-C05 or DA4D-1.01-X2-R1-07
    const a4FloorMatch = cleanCode.match(/DA4D-1\.01-(X[1-8])-(?:R(\d+)-C0*(\d+)|R(\d+)-0*(\d+)|0*(\d+))/i);
    if (a4FloorMatch) {
      cleanZone = a4FloorMatch[1];
      if (a4FloorMatch[2] && a4FloorMatch[3]) {
        numBay = parseInt(a4FloorMatch[2], 10);
        numLevel = parseInt(a4FloorMatch[3], 10) as ShelfLevel;
      } else if (a4FloorMatch[4] && a4FloorMatch[5]) {
        numBay = parseInt(a4FloorMatch[4], 10);
        numLevel = parseInt(a4FloorMatch[5], 10) as ShelfLevel;
      } else if (a4FloorMatch[6]) {
        numBay = parseInt(a4FloorMatch[6], 10);
        numLevel = 1;
      }
    }

    // 4. A2 Flow Rail: DA2D-1-R03-05 or DA2D-1-R03-P05
    const a2RailMatch = cleanCode.match(/DA2D-1-R0*(\d+)-(?:P)?0*(\d+)/i);
    if (a2RailMatch) {
      cleanZone = `R${parseInt(a2RailMatch[1], 10)}`;
      numBay = parseInt(a2RailMatch[2], 10);
      numLevel = 1;
    }

    // 5. A5 Canopy Tent: DA5T-1-06-R4-03 or DA5T-1-06-R4-C03 or DA5T-1-01-R1-C06
    const a5TentMatch = cleanCode.match(/DA5T-([1-4])-(?:0*(\d+)-)?R([1-4])-(?:C)?0*(\d+)/i);
    if (a5TentMatch) {
      cleanZone = `T${a5TentMatch[1]}`;
      if (a5TentMatch[2]) extractedGroup = String(parseInt(a5TentMatch[2], 10)).padStart(2, '0');
      extractedRow = parseInt(a5TentMatch[3], 10);
      extractedCol = parseInt(a5TentMatch[4], 10);
      numLevel = extractedRow as ShelfLevel;
      numBay = extractedCol;
    }
  }

  // CY3 Outdoor Racks
  if (cleanZone.startsWith('CY3') || cleanZone.startsWith('DY3T')) {
    let rowLetter = 'A';
    if (cleanZone.endsWith('-B') || cleanZone === 'B' || cleanZone === 'CY3-B' || cleanCode.includes('1.02')) rowLetter = 'B';
    else if (cleanZone.endsWith('-C') || cleanZone === 'C' || cleanZone === 'CY3-C' || cleanCode.includes('1.03')) rowLetter = 'C';
    else if (cleanZone.endsWith('-D') || cleanZone === 'D' || cleanZone === 'CY3-D' || cleanCode.includes('1.04')) rowLetter = 'D';
    else if (cleanZone.endsWith('-A') || cleanZone === 'A' || cleanZone === 'CY3-A' || cleanCode.includes('1.01')) rowLetter = 'A';
    
    cleanZone = `CY3-${rowLetter}`;
    const rowNum = rowLetter === 'A' ? '1.01' : rowLetter === 'B' ? '1.02' : rowLetter === 'C' ? '1.03' : '1.04';
    const pPos = posSuffix || 'P1';
    
    const canonicalLocator = `DY3T-${rowNum}-${rowLetter}${String(numBay).padStart(2, '0')}-L${numLevel}-${pPos}`;
    return {
      zone: cleanZone as StorageZone,
      bayNumber: numBay,
      level: numLevel,
      palletPosition: pPos,
      canonicalLocator,
      displayLocation: `CY3 Tent Row ${rowLetter} Bay ${numBay} L${numLevel} (${pPos})`
    };
  }

  // A4 Floor Staging (X1-X8)
  if (cleanZone.startsWith('X') || cleanZone.startsWith('DA4D-1')) {
    const xGroup = cleanZone.includes('X') ? cleanZone.substring(cleanZone.indexOf('X')) : 'X1';
    const canonicalLocator = `DA4D-1.01-${xGroup}-${String(numBay).padStart(2, '0')}`;
    return {
      zone: xGroup as StorageZone,
      bayNumber: numBay,
      level: numLevel,
      canonicalLocator,
      displayLocation: `A4 Floor Staging ${xGroup} Bay ${numBay}`
    };
  }

  // A2 Flow Rail (R1-R12)
  if (cleanZone.startsWith('R') || cleanZone.startsWith('FR')) {
    const railNum = cleanZone.replace(/\D/g, '') || '1';
    const canonicalLocator = `DA2D-1-R${String(railNum).padStart(2, '0')}-${String(numBay).padStart(2, '0')}`;
    return {
      zone: `R${railNum}` as StorageZone,
      bayNumber: numBay,
      level: 1,
      canonicalLocator,
      displayLocation: `A2 Flow Rail Lane ${railNum} Pos ${numBay}`
    };
  }

  // A5 Canopy Tent (T1-T4)
  if (cleanZone.startsWith('T') || cleanZone.startsWith('DA5T')) {
    const tentNum = cleanZone.replace(/\D/g, '') || '1';
    const grpStr = extractedGroup || '01';
    const rowNum = extractedRow || numLevel;
    const colNum = extractedCol || numBay;
    const canonicalLocator = `DA5T-${tentNum}-${grpStr}-R${rowNum}-C${String(colNum).padStart(2, '0')}`;
    return {
      zone: `T${tentNum}` as StorageZone,
      bayNumber: colNum,
      level: rowNum as ShelfLevel,
      canonicalLocator,
      displayLocation: `A5 Tent ${tentNum} G${grpStr} R${rowNum}-C${colNum}`
    };
  }

  // A4 Selective Rack B-K
  const prefix = ['G', 'H', 'I', 'J', 'K'].includes(cleanZone) ? 'DA4D-3' : 'DA4D-2';
  const pPos = posSuffix || 'P1';
  const canonicalLocator = `${prefix}-${cleanZone}${String(numBay).padStart(2, '0')}-L${numLevel}-${pPos}`;

  return {
    zone: cleanZone as StorageZone,
    bayNumber: numBay,
    level: numLevel,
    palletPosition: pPos,
    canonicalLocator,
    displayLocation: `A4 Rack Zone ${cleanZone} Bay ${numBay} L${numLevel} (${pPos})`
  };
}
