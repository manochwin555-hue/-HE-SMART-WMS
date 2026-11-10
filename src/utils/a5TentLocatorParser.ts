import { InventoryItem } from '../types';

export interface A5LocatorData {
  tentNum: number;
  groupNum: number;
  rowCode: string; // 'R1', 'R2', 'R3', 'R4'
  colNum: number;  // 1-7
  locator: string;
}

export const parseA5TentLocator = (locatorCode: string, item?: InventoryItem): A5LocatorData => {
  const loc = locatorCode.toUpperCase();
  let tentNum = 1;
  let groupNum = 1;
  let rowCode = 'R1';
  let colNum = 1;

  // Extract Tent number
  const tentMatch = loc.match(/DA5T[-.]?([1-4])/i) || loc.match(/T([1-4])/i);
  if (tentMatch) tentNum = parseInt(tentMatch[1], 10);
  else if (item?.zone?.includes('2')) tentNum = 2;
  else if (item?.zone?.includes('3')) tentNum = 3;
  else if (item?.zone?.includes('4')) tentNum = 4;

  // Extract Group number (01-07)
  const grpMatch = loc.match(/DA5T[-.]?[1-4][-.]?0?([1-7])/i) || loc.match(/G0?([1-7])/i) || loc.match(/-0?([1-7])-R/i);
  if (grpMatch) groupNum = parseInt(grpMatch[1], 10);
  else if (item?.bayNumber && item.bayNumber >= 1 && item.bayNumber <= 7) groupNum = item.bayNumber;

  // Extract Row (R1-R4)
  const rowMatch = loc.match(/R([1-4])/i);
  if (rowMatch) rowCode = `R${rowMatch[1]}`;
  else if (item?.level && item.level >= 1 && item.level <= 4) rowCode = `R${item.level}`;

  // Extract Column (01-07)
  const colMatch = loc.match(/[-C]0?([1-7])$/i) || loc.match(/R[1-4]-0?([1-7])/i);
  if (colMatch) colNum = parseInt(colMatch[1], 10);
  else if (item?.bayNumber && item.bayNumber >= 1 && item.bayNumber <= 7) colNum = item.bayNumber; // ? This seems wrong in original code, column vs group?

  return {
    tentNum,
    groupNum,
    rowCode,
    colNum,
    locator: `DA5T-${tentNum}-${String(groupNum).padStart(2, '0')}-${rowCode}-${String(colNum).padStart(2, '0')}`
  };
};
