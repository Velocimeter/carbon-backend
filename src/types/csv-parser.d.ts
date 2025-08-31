declare module 'csv-parser' {
  interface CsvParserOptions {}
  type CsvParser = (options?: CsvParserOptions) => NodeJS.ReadWriteStream;
  const csv: CsvParser;
  export default csv;
}


