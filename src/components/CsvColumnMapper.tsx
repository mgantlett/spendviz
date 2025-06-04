import { useState, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from './ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from './ui/select';

export type CsvFieldType = 'ignore' | 'date' | 'description' | 'amount' | 'debit' | 'credit';

export interface CsvColumnMapperProps {
  columns: string[];
  previewRows: string[][];
  onMappingChange: (mapping: CsvFieldType[]) => void;
  initialMapping?: CsvFieldType[];
}

const FIELD_OPTIONS: { value: CsvFieldType; label: string }[] = [
  { value: 'ignore', label: 'Ignore' },
  { value: 'date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount (signed)' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
];

export default function CsvColumnMapper({ 
  columns, 
  previewRows, 
  onMappingChange,
  initialMapping
}: CsvColumnMapperProps) {
  const [mapping, setMapping] = useState<CsvFieldType[]>(
    initialMapping && initialMapping.length > 0 ? initialMapping : columns.map(() => FIELD_OPTIONS[0].value)
  );

  useEffect(() => {
    if (initialMapping && initialMapping.length === columns.length) {
      setMapping(initialMapping);
    }
  }, [initialMapping, columns.length]);

  function handleFieldChange(idx: number, value: CsvFieldType) {
    const newMapping = [...mapping];
    newMapping[idx] = value;
    setMapping(newMapping);
    onMappingChange(newMapping);
  }

  return (
    <div className="mb-6">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={col} className="px-2 py-1 ">
                  <Select
                    value={mapping[idx]}
                    onValueChange={val => handleFieldChange(idx, val as CsvFieldType)}
                  >
                    <SelectTrigger className="w-32 text-xs h-8 min-h-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs mt-1 text-muted-foreground">{col}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.slice(0, 5).map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, idx) => (
                  <TableCell key={idx} className="px-2 py-1 ">{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
