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

  // If a full locator string was passed, extract exact components from string first
  if (cleanCode) {
    // 1. CY3 Outdoor Racks: e.g. DY3T-1.03-C05-L2-P2 or DY3T-1.01-A01-L1-P1
    const cy3Match = cleanCode.match(/DY3T-1\.0([1-4])-(?:([A-D]))?0*(\d+)-L([1-4])(?:-P([12]))?/i);
    if (cy3Match) {
      const rowDigit = cy3Match[1]; // '1'->A, '2'->B, '3'->C, '4'->D
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

    // 3. A4 Floor Staging: DA4D-1.01-X3-R2-C05
    const a4FloorMatch = cleanCode.match(/DA4D-1\.01-(X[1-8])-R(\d+)-C0*(\d+)/i);
    if (a4FloorMatch) {
      cleanZone = a4FloorMatch[1];
      numBay = parseInt(a4FloorMatch[2], 10);
      numLevel = parseInt(a4FloorMatch[3], 10) as ShelfLevel;
    }

    // 4. A2 Flow Rail: DA2D-1-R03-05
    const a2RailMatch = cleanCode.match(/DA2D-1-R0*(\d+)-0*(\d+)/i);
    if (a2RailMatch) {
      cleanZone = `R${parseInt(a2RailMatch[1], 10)}`;
      numBay = parseInt(a2RailMatch[2], 10);
      numLevel = 1;
    }

    // 5. A5 Tent: DA5T-2-01-R1-C05 or DA5T-1-01-R1-05
    const a5TentMatch = cleanCode.match(/DA5T-([1-4])-\d+-R([1-4])-[C0]*(\d+)/i);
    if (a5TentMatch) {
      cleanZone = `T${a5TentMatch[1]}`;
      numLevel = parseInt(a5TentMatch[2], 10) as ShelfLevel;
      numBay = parseInt(a5TentMatch[3], 10);
    }
  }

  // Ensure CY3 zone name <-> prefix consistency
  if (cleanZone.startsWith('CY3') || cleanZone.startsWith('DY3T')) {
    let rowLetter = 'A';
    if (cleanZone.includes('B') || cleanZone.endsWith('-B')) rowLetter = 'B';
    else if (cleanZone.includes('C') || cleanZone.endsWith('-C')) rowLetter = 'C';
    else if (cleanZone.includes('D') || cleanZone.endsWith('-D')) rowLetter = 'D';
    
    cleanZone = `CY3-${rowLetter}`;
    const rowNum = rowLetter === 'A' ? '1.01' : rowLetter === 'B' ? '1.02' : rowLetter === 'C' ? '1.03' : '1.04';
    const pPos = posSuffix || 'P1';
    
    const canonicalLocator = `DY3T-${rowNum}-${rowLetter}${String(numBay).padStart(2, '0')}-L${numLevel}-${pPos}`;
    return {
      zone: cleanZone,
      bayNumber: numBay,
      level: numLevel,
      palletPosition: pPos,
      canonicalLocator,
      displayLocation: `CY3 Tent Row ${rowLetter} Bay ${numBay} L${numLevel} (${pPos})`
    };
  }

  if (cleanZone.startsWith('X') || cleanZone.startsWith('DA4D-1')) {
    const xGroup = cleanZone.includes('X') ? cleanZone.substring(cleanZone.indexOf('X')) : 'X1';
    const canonicalLocator = `DA4D-1.01-${xGroup}-R${numBay}-C${String(numLevel).padStart(2, '0')}`;
    return {
      zone: xGroup,
      bayNumber: numBay,
      level: numLevel,
      canonicalLocator,
      displayLocation: `A4 Floor Staging ${xGroup} R${numBay}-C${numLevel}`
    };
  }

  if (cleanZone.startsWith('R') || cleanZone.startsWith('FR')) {
    const railNum = cleanZone.replace(/\D/g, '') || '1';
    const canonicalLocator = `DA2D-1-R${String(railNum).padStart(2, '0')}-${String(numBay).padStart(2, '0')}`;
    return {
      zone: `R${railNum}`,
      bayNumber: numBay,
      level: 1,
      canonicalLocator,
      displayLocation: `A2 Flow Rail Lane ${railNum} Pos ${numBay}`
    };
  }

  if (cleanZone.startsWith('T') || cleanZone.startsWith('DA5T')) {
    const tentNum = cleanZone.replace(/\D/g, '') || '1';
    const canonicalLocator = `DA5T-${tentNum}-01-R${numLevel}-C${String(numBay).padStart(2, '0')}`;
    return {
      zone: `T${tentNum}`,
      bayNumber: numBay,
      level: numLevel,
      canonicalLocator,
      displayLocation: `A5 Tent ${tentNum} R${numLevel}-C${numBay}`
    };
  }

  // A4 Selective Rack B-K
  const prefix = ['G', 'H', 'I', 'J', 'K'].includes(cleanZone) ? 'DA4D-3' : 'DA4D-2';
  const pPos = posSuffix || 'P1';
  const canonicalLocator = `${prefix}-${cleanZone}${String(numBay).padStart(2, '0')}-L${numLevel}-${pPos}`;

  return {
    zone: cleanZone,
    bayNumber: numBay,
    level: numLevel,
    palletPosition: pPos,
    canonicalLocator,
    displayLocation: `A4 Rack Zone ${cleanZone} Bay ${numBay} L${numLevel} (${pPos})`
  };
}
