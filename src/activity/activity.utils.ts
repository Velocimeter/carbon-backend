import { OrderData, ProcessedOrders } from './activity.types';
import { Decimal } from 'decimal.js';
import { StrategyCreatedEvent } from '../events/strategy-created-event/strategy-created-event.entity';
import { StrategyUpdatedEvent } from '../events/strategy-updated-event/strategy-updated-event.entity';
import { StrategyDeletedEvent } from '../events/strategy-deleted-event/strategy-deleted-event.entity';
import { TokensTradedEvent } from '../events/tokens-traded-event/tokens-traded-event.entity';
import { Deployment } from '../deployment/deployment.service';
import { ActivityV2 } from './activity-v2.entity';
import { TokensByAddress } from '../token/token.service';
import { StrategyStatesMap } from './activity.types';

export function parseOrder(orderJson: string): OrderData {
  const order = JSON.parse(orderJson);
  return {
    y: new Decimal(order.y || 0),
    z: new Decimal(order.z || 0),
    A: new Decimal(order.A || 0),
    B: new Decimal(order.B || 0),
  };
}

export function processOrders(
  order0: OrderData,
  order1: OrderData,
  decimals0: Decimal,
  decimals1: Decimal,
): ProcessedOrders {
  // Constants
  const two48 = new Decimal(2).pow(48);
  const denominator0 = new Decimal(10).pow(decimals0);
  const denominator1 = new Decimal(10).pow(decimals1);

  // Normalize y and z values
  const liquidity0 = order0.y.div(denominator0);
  const capacity0 = order0.z.div(denominator0);
  const liquidity1 = order1.y.div(denominator1);
  const capacity1 = order1.z.div(denominator1);

  // For order0: compute B0_real and A0_real
  const B0_remainder = order0.B.mod(two48);
  const B0_exponent = order0.B.div(two48).floor();
  const B0_real = B0_remainder.mul(new Decimal(2).pow(B0_exponent));

  const A0_remainder = order0.A.mod(two48);
  const A0_exponent = order0.A.div(two48).floor();
  const A0_real = A0_remainder.mul(new Decimal(2).pow(A0_exponent));

  // For order1: compute B1_real and A1_real
  const B1_remainder = order1.B.mod(two48);
  const B1_exponent = order1.B.div(two48).floor();
  const B1_real = B1_remainder.mul(new Decimal(2).pow(B1_exponent));

  const A1_remainder = order1.A.mod(two48);
  const A1_exponent = order1.A.div(two48).floor();
  const A1_real = A1_remainder.mul(new Decimal(2).pow(A1_exponent));

  // Multipliers to adjust for the difference in decimals between tokens
  const multiplierSell = new Decimal(10).pow(decimals1.sub(decimals0));
  const multiplierBuy = new Decimal(10).pow(decimals0.sub(decimals1));

  // --- For the sell side (order0 values) ---
  // Compute lowest, marginal, and highest rates for token0 side.
  const lowestRate0 = new Decimal(B0_real.div(two48)).pow(2).mul(multiplierSell);
  const highestRate0 = new Decimal(B0_real.plus(A0_real).div(two48)).pow(2).mul(multiplierSell);
  const baseMarg0 = liquidity0.equals(capacity0)
    ? B0_real.plus(A0_real)
    : B0_real.plus(A0_real.mul(liquidity0).div(capacity0));
  const marginalRate0 = new Decimal(baseMarg0.div(two48)).pow(2).mul(multiplierSell);

  // --- For the buy side (order1 values) ---
  const lowestRate1 = new Decimal(B1_real.div(two48)).pow(2).mul(multiplierBuy);
  const highestRate1 = new Decimal(B1_real.plus(A1_real).div(two48)).pow(2).mul(multiplierBuy);
  const baseMarg1 = liquidity1.equals(capacity1)
    ? B1_real.plus(A1_real)
    : B1_real.plus(A1_real.mul(liquidity1).div(capacity1));
  const marginalRate1 = new Decimal(baseMarg1.div(two48)).pow(2).mul(multiplierBuy);

  // --- Final Price Calculations ---
  // On the sell side invert the computed raw values:
  const sellPriceA = highestRate0.isZero() ? new Decimal(0) : new Decimal(1).div(highestRate0);
  const sellPriceMarg = marginalRate0.isZero() ? new Decimal(0) : new Decimal(1).div(marginalRate0);
  const sellPriceB = lowestRate0.isZero() ? new Decimal(0) : new Decimal(1).div(lowestRate0);

  // On the buy side, the values are used directly:
  const buyPriceA = lowestRate1;
  const buyPriceMarg = marginalRate1;
  const buyPriceB = highestRate1;

  return {
    y0: order0.y.toString(),
    z0: order0.z.toString(),
    y1: order1.y.toString(),
    z1: order1.z.toString(),
    liquidity0,
    capacity0,
    liquidity1,
    capacity1,
    sellPriceA,
    sellPriceMarg,
    sellPriceB,
    buyPriceA,
    buyPriceMarg,
    buyPriceB,
  };
}
// TODO: Add tradeByAmou
// Note: TokensTradedEvent is handled separately in createActivityFromTokensTradedEvent
export function createActivityFromEvent(
  event: StrategyCreatedEvent | StrategyUpdatedEvent | StrategyDeletedEvent,
  action: string,
  deployment: Deployment,
  tokens: TokensByAddress,
  strategyStates: StrategyStatesMap,
  fees?: { fee: string; feeToken: string } | null
): ActivityV2 {
  // Handle other event types (StrategyCreatedEvent, StrategyUpdatedEvent, StrategyDeletedEvent)
  const token0 = tokens[event.token0.address];
  const token1 = tokens[event.token1.address];

  if (!token0 || !token1) {
    throw new Error(`Token not found for addresses ${event.token0.address}, ${event.token1.address}`);
  }

  const decimals0 = new Decimal(token0.decimals);
  const decimals1 = new Decimal(token1.decimals);

  // Parse the orders from the event
  const order0 = parseOrder(event.order0);
  const order1 = parseOrder(event.order1);

  // Process the orders using the updated processOrders function.
  const processedOrders = processOrders(order0, order1, decimals0, decimals1);

  // If this is an update event that (by default) is returning 'edit_price',
  // then check if all price fields are zero and if so mark it as paused
  if (event instanceof StrategyUpdatedEvent && action === 'edit_price') {
    if (
      processedOrders.sellPriceA.equals(0) &&
      processedOrders.sellPriceB.equals(0) &&
      processedOrders.buyPriceA.equals(0) &&
      processedOrders.buyPriceB.equals(0)
    ) {
      action = 'strategy_paused';
    }
  }

  const activity = new ActivityV2();
  activity.blockchainType = deployment.blockchainType;
  activity.exchangeId = deployment.exchangeId;
  activity.action = action;
  
  activity.strategyId = event.strategyId;
  activity.baseQuote = `${event.token0.symbol}/${event.token1.symbol}`;

  // Set token information.
  activity.baseSellToken = event.token0.symbol;
  activity.baseSellTokenAddress = event.token0.address;
  activity.quoteBuyToken = event.token1.symbol;
  activity.quoteBuyTokenAddress = event.token1.address;

  // Budget information is now taken from the liquidity (normalized y) values.
  activity.sellBudget = processedOrders.liquidity0.toString();
  activity.buyBudget = processedOrders.liquidity1.toString();

  // Price information comes directly from the processed order prices.
  // For the sell side (token0 -> token1):
  activity.sellPriceA = processedOrders.sellPriceA.toString();
  activity.sellPriceMarg = processedOrders.sellPriceMarg.toString();
  activity.sellPriceB = processedOrders.sellPriceB.toString();

  // For the buy side (token1 -> token0):
  activity.buyPriceA = processedOrders.buyPriceA.toString();
  activity.buyPriceMarg = processedOrders.buyPriceMarg.toString();
  activity.buyPriceB = processedOrders.buyPriceB.toString();

  // Set transaction details.
  activity.timestamp = event.timestamp;
  activity.txhash = event.transactionHash;
  activity.blockNumber = event.block.id;
  activity.transactionIndex = event.transactionIndex;
  activity.logIndex = event.logIndex;

  // Set creation wallet and current owner.
  if (event instanceof StrategyCreatedEvent) {
    activity.creationWallet = event.owner;
    activity.currentOwner = event.owner;
  } else if (strategyStates.has(event.strategyId)) {
    const previousState = strategyStates.get(event.strategyId);
    activity.creationWallet = previousState.creationWallet;
    activity.currentOwner = previousState.currentOwner;
  }

  // Set token relationships and order data.
  activity.token0 = token0;
  activity.token0Id = token0.id;
  activity.token1 = token1;
  activity.token1Id = token1.id;
  activity.order0 = event.order0;
  activity.order1 = event.order1;

  // Calculate budget and price delta changes if there is a previous state.
  const previousState = strategyStates.get(event.strategyId);
  if (previousState) {
    const prevProcessed = processOrders(
      parseOrder(previousState.order0),
      parseOrder(previousState.order1),
      decimals0,
      decimals1,
    );

    // Calculate liquidity delta on each side.
    const liquidity0Delta = processedOrders.liquidity0.minus(prevProcessed.liquidity0);
    const liquidity1Delta = processedOrders.liquidity1.minus(prevProcessed.liquidity1);
    activity.sellBudgetChange = liquidity0Delta.toString();
    activity.buyBudgetChange = liquidity1Delta.toString();

    // dunksFees 


    // Price deltas.
    activity.sellPriceADelta = processedOrders.sellPriceA.minus(prevProcessed.sellPriceA).toString();
    activity.sellPriceMargDelta = processedOrders.sellPriceMarg.minus(prevProcessed.sellPriceMarg).toString();
    activity.sellPriceBDelta = processedOrders.sellPriceB.minus(prevProcessed.sellPriceB).toString();
    activity.buyPriceADelta = processedOrders.buyPriceA.minus(prevProcessed.buyPriceA).toString();
    activity.buyPriceMargDelta = processedOrders.buyPriceMarg.minus(prevProcessed.buyPriceMarg).toString();
    activity.buyPriceBDelta = processedOrders.buyPriceB.minus(prevProcessed.buyPriceB).toString();

    // For trade events (reason = 1) compute additional trade info and fees
    if (event instanceof StrategyUpdatedEvent && event.reason === 1) {
      if (liquidity0Delta.isNegative() && liquidity1Delta.gte(0)) {
        activity.strategySold = liquidity0Delta.negated().toString();
        activity.tokenSold = event.token0.symbol;
        activity.strategyBought = liquidity1Delta.toString();
        activity.tokenBought = event.token1.symbol;
        activity.avgPrice = liquidity0Delta.isZero() ? '0' : liquidity1Delta.div(liquidity0Delta.negated()).toString();
        activity.action = 'sell_high';
      } else if (liquidity1Delta.isNegative() && liquidity0Delta.gt(0)) {
        activity.strategySold = liquidity1Delta.negated().toString();
        activity.tokenSold = event.token1.symbol;
        activity.strategyBought = liquidity0Delta.toString();
        activity.tokenBought = event.token0.symbol;
        activity.avgPrice = liquidity0Delta.isZero() ? '0' : liquidity1Delta.negated().div(liquidity0Delta).toString();
        activity.action = 'buy_low';
      }

      // Add fee information if available
      if (fees) {
        activity.fee = fees.fee;
        activity.feeToken = fees.feeToken;
      }
    }
  }

  return activity;
}

export function ordersEqual(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  return keys1.every((key) => {
    const val1 = obj1[key];
    const val2 = obj2[key];
    if (val1 instanceof Decimal && val2 instanceof Decimal) {
      return val1.equals(val2);
    }
    return val1 === val2;
  });
}





/**
 * Calculates the fee based on the fee scheme from Strategies.sol
 * 
 * Fee scheme from the contract:
 * For bySourceAmount (byTargetAmount = false):
 * - Trader transfers fixed source amount
 * - Fee is taken from target amount
 * - Fee is in target token
 * 
 * For byTargetAmount (byTargetAmount = true):
 * - Trader transfers variable source amount
 * - Fee is taken from source amount
 * - Fee is in source token
 * 
 * Note: liquidity deltas are already normalized by their respective token decimals
 * 
 * @param tokensTradedEvent The TokensTradedEvent containing fee information
 * @param strategyUpdatedEvent The StrategyUpdatedEvent that triggered the trade (one of potentially many)
 * @param liquidity0Delta The liquidity delta for token0
 * @param liquidity1Delta The liquidity delta for token1
 * @returns An object containing the fee amount and the token it's denominated in
 */
export function calculateFeeFromTokensTradedEvent(
  tokensTradedEvent: {
    tradingFeeAmount: string,
    sourceAmount: string,
    targetAmount: string,
    byTargetAmount: boolean,
    sourceToken: { address: string, symbol: string, decimals: number },
    targetToken: { address: string, symbol: string, decimals: number }
  },
  strategyUpdatedEvent: {
    token0: { address: string },
    token1: { address: string }
  },
  liquidity0Delta: Decimal,
  liquidity1Delta: Decimal
): { 
  fee: string,  // human readable fee
  feeToken: string 
} {
  if (!tokensTradedEvent.tradingFeeAmount) {
    return { fee: '0', feeToken: '' };
  }

  const totalTradeFeeAmount = new Decimal(tokensTradedEvent.tradingFeeAmount);
  const byTargetAmount = tokensTradedEvent.byTargetAmount;

  // First determine which token the fee is in
  // if byTargetAmount = true: fee is in source token
  // if byTargetAmount = false: fee is in target token
/*
  fee scheme:
 * +-------------------+---------------------------------+---------------------------------+
 * | trade function    | trader transfers to contract    | contract transfers to trader    |
 * +-------------------+---------------------------------+---------------------------------+
 * | byTargetAmount(x) | trader transfers to contract: x | p = expectedTargetAmount(x)     |
 * |false              |                                 | q = p * (100 - fee%) / 100      |
 * |                   |                                 | contract transfers to trader: q |
 * |                   |                                 | contract retains as fee: p - q  |
 * +-------------------+---------------------------------+---------------------------------+
 * | byTargetAmount(x) | p = requiredSourceAmount(x)     | contract transfers to trader: x |
 * |true               | q = p * 100 / (100 - fee%)      |                                 |
 * |                   | trader transfers to contract: q |                                 |
 * |                   | contract retains as fee: q - p  |                                 |
 * +-------------------+---------------------------------+---------------------------------+
 */
  let feeToken;
  if (tokensTradedEvent.byTargetAmount === true) {
    // Fee is in source token when target amount is fixed
    feeToken = tokensTradedEvent.sourceToken;
  } else if (tokensTradedEvent.byTargetAmount === false) {
    // Fee is in target token when source amount is fixed
    feeToken = tokensTradedEvent.targetToken;
  }

  // Log total fee info immediately after we have both fee amount and token
  const humanReadableTotalFee = totalTradeFeeAmount.dividedBy(new Decimal(10).pow(feeToken.decimals));
  console.log('Trade Fee Info:', {
    totalTradeFeeAmount: totalTradeFeeAmount.toString() + ' (raw)',
    humanReadableTotalFee: humanReadableTotalFee.toFixed(18) + ' (human readable)',
    feeToken: feeToken.symbol,
    decimals: feeToken.decimals
  });

  // use the same delta as the fee was paid in now that we know which token that is. If token0 then liquidity0Delta, otherwise liquidity1Delta
  const feeIsToken0 = feeToken.address === strategyUpdatedEvent.token0.address;

  let relevantDelta;
  if (feeIsToken0 === true) {
    relevantDelta = liquidity0Delta;
  } else if (feeIsToken0 === false) {
    relevantDelta = liquidity1Delta;
  }

  // Compare relevant delta with source / target as a sanity check
  console.log('Deltas vs Fee:', {
    byTargetAmount,
    feeIsToken0,
    liquidity0Delta: liquidity0Delta.toString() + ' (raw)',
    liquidity1Delta: liquidity1Delta.toString() + ' (raw)',
    relevantDelta: relevantDelta.toString() + ' (raw)',
    sourceAmount: tokensTradedEvent.sourceAmount + ' (raw)',
    targetAmount: tokensTradedEvent.targetAmount + ' (raw)',
    humanReadableLiquidity0Delta: new Decimal(liquidity0Delta).div(`1e${tokensTradedEvent.sourceToken.decimals}`).toFixed(18) + ' (normalized)',
    humanReadableLiquidity1Delta: new Decimal(liquidity1Delta).div(`1e${tokensTradedEvent.targetToken.decimals}`).toFixed(18) + ' (normalized)',
    humanReadableSourceAmount: new Decimal(tokensTradedEvent.sourceAmount).div(`1e${tokensTradedEvent.sourceToken.decimals}`).toFixed(18) + ' (normalized)',
    humanReadableTargetAmount: new Decimal(tokensTradedEvent.targetAmount).div(`1e${tokensTradedEvent.targetToken.decimals}`).toFixed(18) + ' (normalized)',
    humanReadableTradeFeeAmount: new Decimal(totalTradeFeeAmount).div(`1e${feeToken.decimals}`).toFixed(18) + ' (normalized)',
    feeToken: feeToken.symbol,
    tradeFeeAmount: totalTradeFeeAmount.toString() + ' (raw)'
  });

  // Calculate this strategy's proportion of the total trade
  const totalDelta = byTargetAmount
    ? new Decimal(tokensTradedEvent.sourceAmount)  // already includes fee (q)
    : new Decimal(tokensTradedEvent.targetAmount).sub(totalTradeFeeAmount);  // q = p - fee for target

  // Calculate proportion using normalized values (both represent amounts after fees)
  const proportion = relevantDelta.abs().div(totalDelta.div(`1e${feeToken.decimals}`));
  
  // Calculate this strategy's portion of the fee (in raw form)
  const rawStrategyFee = totalTradeFeeAmount.mul(proportion);
  
  // Convert to human readable for return value
  const humanReadableStrategyFee = rawStrategyFee.div(`1e${feeToken.decimals}`);

  // Calculate what percent the fee is of the relevant delta (should be ~0.3%)
  const feePercent = humanReadableStrategyFee
    .div(relevantDelta.abs())  // both are normalized now
    .mul(100);

  // Calculate what percent the total fee is of the total trade amount
  const totalFeePercent = totalTradeFeeAmount
    .div(totalDelta)  // both are raw now
    .mul(100);
  
  console.log('Fee percentages:', {
    rawStrategyFee: rawStrategyFee.toString() + ' (raw)',
    relevantDelta: relevantDelta.abs().toString() + ' (raw)',
    feePercent: feePercent.toFixed(18) + '%',
    totalFeePercent: totalFeePercent.toFixed(18) + '%',
    expectedPercent: '0.3%',
    isExpectedRange: feePercent.gte(0.29) && feePercent.lte(0.31)
  });

  console.log('Final Fee:', {
    strategyFee: Number(humanReadableStrategyFee).toFixed(18),
    totalFee: Number(totalTradeFeeAmount.div(`1e${feeToken.decimals}`)).toFixed(18),
    token: feeToken.symbol,
    decimals: feeToken.decimals
  });

  return {
    fee: humanReadableStrategyFee.toString(),  // human readable version
    //
    feeToken: byTargetAmount ? tokensTradedEvent.sourceToken.address : tokensTradedEvent.targetToken.address
  };
}
