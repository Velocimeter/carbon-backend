import { Injectable } from '@nestjs/common';
import { SimulatorDto } from './simulator.dto';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import Decimal from 'decimal.js';
import moment from 'moment';
import { toTimestamp } from '../../utilities';
import { PairTradingFeePpmUpdatedEventService } from '../../events/pair-trading-fee-ppm-updated-event/pair-trading-fee-ppm-updated-event.service';
import { TradingFeePpmUpdatedEventService } from '../../events/trading-fee-ppm-updated-event/trading-fee-ppm-updated-event.service';
import { HistoricQuoteService } from '../../historic-quote/historic-quote.service';
import { Deployment } from '../../deployment/deployment.service';
import { CodexService } from '../../codex/codex.service';

@Injectable()
export class SimulatorService {
  constructor(
    private readonly tradingFeePpmUpdatedEventService: TradingFeePpmUpdatedEventService,
    private readonly pairTradingFeePpmUpdatedEventService: PairTradingFeePpmUpdatedEventService,
    private readonly historicQuoteService: HistoricQuoteService,
    private readonly codexService: CodexService,
  ) {}

  async seedTokensToCodex(baseToken: string, quoteToken: string, deployment: Deployment, start: number, end: number): Promise<void> {
    const tokens = [baseToken.toLowerCase(), quoteToken.toLowerCase()];
    const MINIMUM_POINTS_PER_TOKEN = 7; // At least 90 points per token (3 months of daily data)
    
    // Check existing data first
    const existingData = await this.historicQuoteService.getHistoryQuotesBuckets(
      deployment.blockchainType,
      tokens,
      start,
      end
    );

    // Check if we have enough data points for each token
    const needsMoreData = tokens.some(token => {
      const tokenData = existingData[token];
      return !tokenData || tokenData.length < MINIMUM_POINTS_PER_TOKEN;
    });

    if (needsMoreData) {
      // Delete existing data for these tokens in the simulation period
      await this.historicQuoteService.deleteQuotes(deployment.blockchainType, tokens);
      
      // Always fetch maximum allowed range (12 months) from Codex
      const maxEnd = moment().unix();
      const maxStart = moment().subtract(12, 'months').startOf('day').unix();
      
      console.log(`Fetching maximum available data (12 months) from Codex for tokens: ${tokens.join(', ')}`);
      console.log(`Time range: ${moment.unix(maxStart).format('YYYY-MM-DD')} to ${moment.unix(maxEnd).format('YYYY-MM-DD')}`);
      
      // Get historical quotes from Codex
      const quotes = await this.codexService.getHistoricalQuotes(
        deployment, 
        tokens,
        maxStart, 
        maxEnd
      );
      
      const insufficientDataTokens = [];
      
      for (const token of tokens) {
        const tokenQuotes = quotes[token];
        if (Array.isArray(tokenQuotes)) {
          // Store the quotes
          for (const quote of tokenQuotes) {
            await this.historicQuoteService.addQuote({
              tokenAddress: token,
              usd: quote.usd,
              timestamp: new Date(moment.unix(quote.timestamp).utc().toISOString()),
              provider: 'codex',
              blockchainType: deployment.blockchainType,
            });
          }
          
          console.log(`Stored ${tokenQuotes.length} total quotes for token ${token}`);
          
          // Check bucketed data instead of raw points
          const bucketedData = await this.historicQuoteService.getHistoryQuotesBuckets(
            deployment.blockchainType,
            [token],
            start,
            end
          );
          
          const bucketedQuotes = bucketedData[token] || [];
          console.log(`${bucketedQuotes.length} daily buckets fall within simulation period`);
          
          if (bucketedQuotes.length < MINIMUM_POINTS_PER_TOKEN) {
            insufficientDataTokens.push({
              address: token,
              available: bucketedQuotes.length,
              needed: MINIMUM_POINTS_PER_TOKEN,
              earliestData: tokenQuotes.length > 0 ? moment.unix(tokenQuotes[0].timestamp).format('YYYY-MM-DD') : 'No data'
            });
          }
        }
      }
      
      // If any tokens still don't have enough data, throw an error with details
      if (insufficientDataTokens.length > 0) {
        const details = insufficientDataTokens.map(token => 
          `${token.address}:\n` +
          `- Points in simulation period: ${token.available}\n` +
          `- Minimum needed: ${token.needed}\n` +
          `- Earliest available data: ${token.earliestData}`
        ).join('\n\n');
        
        throw new Error(
          `Not enough historical data available for simulation period.\n` +
          `Simulation period: ${moment.unix(start).format('YYYY-MM-DD')} to ${moment.unix(end).format('YYYY-MM-DD')}\n\n` +
          `Token details:\n${details}`
        );
      }
    } else {
      console.log(`Sufficient data already exists for all tokens in the simulation period`);
    }
  }

  async generateSimulation(params: SimulatorDto, usdPrices: any, deployment: Deployment): Promise<any> {
    const { start, end, buyBudget, sellBudget, buyMin, buyMax, sellMin, sellMax } = params;
    const baseToken = params['baseToken'].toLowerCase();
    const quoteToken = params['quoteToken'].toLowerCase();

    // First check how much historical data we have by requesting a full year
    const maxEnd = moment().unix();
    const maxStart = moment().subtract(12, 'months').startOf('day').unix();
    const tokens = [baseToken, quoteToken];

    console.log(`Checking available historical data from ${moment.unix(maxStart).format('YYYY-MM-DD')} to ${moment.unix(maxEnd).format('YYYY-MM-DD')}`);
    
    const availableData = await this.historicQuoteService.getHistoryQuotesBuckets(
      deployment.blockchainType,
      tokens,
      maxStart,
      maxEnd,
    );

    // Log what we found
    console.log(`Available data points:`)
    console.log(`Base token (${baseToken}): ${availableData[baseToken]?.length || 0} daily candles`);
    console.log(`Quote token (${quoteToken}): ${availableData[quoteToken]?.length || 0} daily candles`);

    // Check if we have enough data points for both tokens
    const MINIMUM_POINTS_PER_TOKEN = 30; // At least 90 points per token (3 months of daily data)
    const needsMoreData = (!availableData[baseToken] || availableData[baseToken].length < MINIMUM_POINTS_PER_TOKEN) ||
                         (!availableData[quoteToken] || availableData[quoteToken].length < MINIMUM_POINTS_PER_TOKEN);

    if (needsMoreData) {
      console.log(`Insufficient historical data available. Fetching from Codex...`);
      
      // Fetch more data from Codex - this will throw if it can't get enough data
      await this.seedTokensToCodex(baseToken, quoteToken, deployment, start, end);
      
      // Check available data again after seeding
      const updatedData = await this.historicQuoteService.getHistoryQuotesBuckets(
        deployment.blockchainType,
        tokens,
        maxStart,
        maxEnd,
      );
      
      console.log(`After fetching from Codex:`)
      console.log(`Base token (${baseToken}): ${updatedData[baseToken]?.length || 0} daily candles`);
      console.log(`Quote token (${quoteToken}): ${updatedData[quoteToken]?.length || 0} daily candles`);
      
      // Double check we actually got enough data
      if (!updatedData[baseToken] || updatedData[baseToken].length < MINIMUM_POINTS_PER_TOKEN ||
          !updatedData[quoteToken] || updatedData[quoteToken].length < MINIMUM_POINTS_PER_TOKEN) {
        throw new Error(
          `Failed to get sufficient historical data after fetching from Codex.\n` +
          `Base token (${baseToken}): ${updatedData[baseToken]?.length || 0} daily candles\n` +
          `Quote token (${quoteToken}): ${updatedData[quoteToken]?.length || 0} daily candles\n` +
          `Minimum required: ${MINIMUM_POINTS_PER_TOKEN} daily candles`
        );
      }
    }

    // Now get just the data for the simulation period
    const prices = await this.historicQuoteService.getHistoryQuotesBuckets(
      deployment.blockchainType,
      tokens,
      start,
      end,
    );

    const pricesBaseToken = prices[baseToken];
    const pricesQuoteToken = prices[quoteToken];

    // Synchronize arrays to have the same length
    const minLength = Math.min(pricesBaseToken.length, pricesQuoteToken.length);
    const trimmedPricesBaseToken = pricesBaseToken.slice(0, minLength);
    const trimmedPricesQuoteToken = pricesQuoteToken.slice(0, minLength);

    // Use the trimmed arrays for dates and pricesRatios
    const dates = trimmedPricesBaseToken.map((p) => moment.unix(p.timestamp).toISOString());
    const pricesRatios = trimmedPricesBaseToken.map((p, i) =>
      new Decimal(p.close).div(trimmedPricesQuoteToken[i].close).toString(),
    );

    // handle fees
    const DEFAULT_FEE_PPM = 4000;
    const lastFeeEvent = await this.tradingFeePpmUpdatedEventService.last(deployment);
    const defaultFee = lastFeeEvent ? lastFeeEvent.newFeePPM : DEFAULT_FEE_PPM;
    
    const pairFees = await this.pairTradingFeePpmUpdatedEventService.allAsDictionary(deployment);
    let feePpm;
    if (pairFees[baseToken] && pairFees[baseToken][quoteToken]) {
      feePpm = pairFees[baseToken][quoteToken];
    } else {
      feePpm = defaultFee;
    }

    // Step 1: Create input.json
    const timestamp = Date.now();
    const folderPath = path.join(__dirname, `../../simulator/simulation_${timestamp}`);
    const inputFilePath = path.join(folderPath, 'input.json');
    const outputPath = path.join(folderPath, 'output.json');

    // create inputData object
    const inputData = {
      portfolio_cash_value: buyBudget.toString(),
      portfolio_risk_value: sellBudget.toString(),
      low_range_low_price: buyMin.toString(),
      low_range_high_price: buyMax.toString(),
      low_range_start_price: buyMax.toString(),
      high_range_low_price: sellMin.toString(),
      high_range_high_price: sellMax.toString(),
      high_range_start_price: sellMin.toString(),
      network_fee: `${feePpm / 1000000}`,
      prices: pricesRatios,
    };

    // Create folder if it doesn't exist
    await fsPromises.mkdir(folderPath, { recursive: true });

    // Write input data to input.json
    await fsPromises.writeFile(inputFilePath, JSON.stringify(inputData, null, 2));

    return this.runPythonSimulation(inputFilePath, outputPath, dates, pricesRatios);
  }

  private async runPythonSimulation(inputFilePath: string, outputPath: string, dates: string[], pricesRatios: string[]): Promise<any> {
    // Step 2: Run Python executable
    const pythonExecutablePath = path.join(__dirname, '../../simulator/run.py');
    
    // Try different Python commands based on environment
    const pythonCommands = process.platform === 'win32' 
      ? ['py', 'python'] // Windows: try py launcher first, then python
      : ['python3', 'python']; // Unix: try python3 first, then python
    
    let pythonProcess: childProcess.ChildProcess | null = null;
    let error: Error | null = null;

    // Try each command until one works
    for (const cmd of pythonCommands) {
      try {
        pythonProcess = childProcess.spawn(cmd, [pythonExecutablePath, '-c', inputFilePath, '-o', outputPath]);
        break; // If spawn doesn't throw, we found a working command
      } catch (e) {
        error = e as Error;
        continue; // Try next command if this one failed
      }
    }

    if (!pythonProcess) {
      throw new Error(`Failed to start Python process. Please ensure Python 3 is installed and in PATH. Error: ${error?.message}`);
    }

    // Capture Python process output
    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
    });

    try {
      // Return a promise that resolves with the content of the output.json file
      await new Promise<void>((resolve, reject) => {
        // Handle process exit
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}`));
            return;
          }

          resolve();
        });
      });

      // Read the content of the output.json file
      const outputData = await fsPromises.readFile(outputPath, 'utf-8');

      const parsedOutput = JSON.parse(outputData);
      // Add the 'dates' array to the result
      parsedOutput.dates = dates.map((d) => toTimestamp(new Date(d)));

      return { ...parsedOutput, prices: pricesRatios };
    } catch (err) {
      throw err;
    }
  }
}
