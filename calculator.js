// GCACW Full Combat Matrix Lookup
const COMBAT_CHART = {
  "-8": ["-", "3D"],
  "-7": ["-", "2D"],
  "-6": ["-", "2D"],
  "-5": ["-", "1"],
  "-4": ["-", "1D"],
  "-3": ["-", "1D"],
  "-2": ["f", "D"],
  "-1": ["F", "D"],
  "0":  ["d", "d"],
  "1":  ["d", "1d"],
  "2":  ["1d", "1D"],
  "3":  ["1D", "2D"],
  "4":  ["1DR", "fa"],
  "5":  ["2DR", "1fa"],
  "6":  ["2DR*", "1fa"],
  "7":  ["3DR*", "2fa"],
  "8":  ["4DR*", "2fa"],
  "9":  ["5DR*", "3fa"],
  "10": ["5DR*", "3fa"]
};

function getRatioDRM(attackerCV, defenderCV) {
  const ratio = attackerCV / defenderCV;
  if (ratio >= 8) return 13;
  if (ratio >= 7) return 11;
  if (ratio >= 6) return 9;
  if (ratio >= 5) return 8;
  if (ratio >= 4) return 6;
  if (ratio >= 3) return 4;
  if (ratio >= 2) return 2;
  if (ratio >= 1.5) return 1;
  if (ratio >= 1) return 0;
  if (ratio >= 0.66) return -1;
  if (ratio >= 0.5) return -2;
  if (ratio >= 0.33) return -4;
  if (ratio >= 0.25) return -6;
  if (ratio >= 0.2) return -8;
  return -12;
}

function calculateCombat(params) {
  const {
    selectedGame, attackerSide, attackerCV, defenderCV,
    attackerArty, defenderArty,
    attackerTac, defenderTac,
    actionType, marchType,
    terrain, hexside,
    leaderBonus, flankBonus, flanksRefused,
    isRain, isDemoralized2, isUnionPanic,
    fortificationType, customPartialFort,
    breastworkCount, fortCount, unfortifiedCount,
    attackerRoll, defenderRoll
  } = params;

  let attackerDRM = 0;
  let defenderDRM = 0;
  const breakdown = [];

  // Add Active Game Context
  breakdown.push(`Game Selected: ${selectedGame.toUpperCase()}`);

  // 1. Ratio DRM
  const ratioDRM = getRatioDRM(attackerCV, defenderCV);
  attackerDRM += ratioDRM;
  breakdown.push(`Ratio DRM: ${ratioDRM >= 0 ? '+' : ''}${ratioDRM}`);

  // 2. Tactical DRM
  const tacDRM = attackerTac - defenderTac;
  attackerDRM += tacDRM;
  breakdown.push(`Tactical DRM (${attackerTac} vs ${defenderTac}): ${tacDRM >= 0 ? '+' : ''}${tacDRM}`);

  // 3. Attack Type / Action
  if (actionType === 'assault') {
    attackerDRM += 1;
    breakdown.push('Assault Action: +1');
  } else {
    if (marchType === 'column') { attackerDRM -= 3; breakdown.push('Column of Route: -3'); }
    else if (marchType === 'hasty') { attackerDRM -= 1; breakdown.push('Hasty Attack: -1'); }
    else if (marchType === 'prepared') { attackerDRM += 1; breakdown.push('Prepared Attack: +1'); }
  }

  // 4. Game-Specific Leader Bonuses
  if (leaderBonus !== 'none') {
    let validLeader = false;
    // Check game compatibility according to GCACW Rule 7.4
    if (leaderBonus === 'lee' && ['sjw','otr','hcr','btc','slb','gtc','tpc','llo'].includes(selectedGame)) validLeader = true;
    else if (leaderBonus === 'jackson' && ['sjw','hcr','slb'].includes(selectedGame)) validLeader = true;
    else if (leaderBonus === 'longstreet' && ['gtc','bac','tpc'].includes(selectedGame)) validLeader = true;
    else if (leaderBonus === 'sherman' && ['bac'].includes(selectedGame)) validLeader = true;
    else if (leaderBonus === 'hood_forrest' && ['hsn'].includes(selectedGame)) validLeader = true;
    else if (leaderBonus === 'thomas' && ['tom','gtc','bac'].includes(selectedGame)) validLeader = true;

    if (validLeader) {
      attackerDRM += 1;
      breakdown.push(`Leader Assault Bonus (${leaderBonus.toUpperCase()}): +1`);
    } else {
      breakdown.push(`Leader Bonus (${leaderBonus.toUpperCase()}) invalid for ${selectedGame.toUpperCase()} (Ignored)`);
    }
  }

  // 5. Flank Attack Bonus & Flanks Refused
  let rawFlank = parseInt(flankBonus) || 0;
  if (rawFlank > 0) {
    if (flanksRefused) {
      const netFlank = Math.max(0, rawFlank - 1);
      attackerDRM += netFlank;
      breakdown.push(`Flank Attack (+${rawFlank}) vs Refused Flanks (-1): +${netFlank} DRM`);
    } else {
      attackerDRM += rawFlank;
      breakdown.push(`Flank Attack Bonus: +${rawFlank}`);
    }
  } else if (flanksRefused) {
    breakdown.push('Defender Flanks Refused: No flank bonus to reduce');
  }

  // 6. Fortifications
  let fortDRM = 0;
  if (customPartialFort) {
    const totalUnits = breastworkCount + fortCount + unfortifiedCount;
    if (totalUnits > 0) {
      const weightedVal = (breastworkCount * 1) + (fortCount * 2) + (unfortifiedCount * 0);
      fortDRM = Math.round(weightedVal / totalUnits);
      breakdown.push(`Partial Fortification (Weighted Avg: ${breastworkCount} BW, ${fortCount} Fort, ${unfortifiedCount} Open): +${fortDRM} Def DRM`);
    }
  } else {
    if (fortificationType === 'breastworks') {
      fortDRM = 1;
      breakdown.push('Breastworks (Defender): +1');
    } else if (fortificationType === 'redoubt' || fortificationType === 'fort') {
      fortDRM = 2;
      breakdown.push('Redoubt / Permanent Fort (Defender): +2');
    } else if (fortificationType === 'abatis') {
      fortDRM = 1;
      breakdown.push('Abatis (Defender): +1');
    }
  }
  defenderDRM += fortDRM;

  // 7. Terrain & Hexside
  if (hexside === 'creek') {
    const creekVal = isRain ? 2 : 1;
    defenderDRM += creekVal;
    breakdown.push(`Creek Hexside (Defender): +${creekVal}`);
  } else if (hexside === 'bridge') {
    defenderDRM += 2;
    breakdown.push('Bridge/Ford/Ferry/Dam (Defender): +2');
  } else if (hexside === 'ridge_up') {
    defenderDRM += 2;
    breakdown.push('Uphill Ridge (Defender): +2');
  } else if (hexside === 'ridge_down') {
    const ridgeVal = (terrain === 'mountain') ? 1 : 0;
    if (ridgeVal > 0) { defenderDRM += ridgeVal; breakdown.push('Downhill Ridge into Mountain: +1'); }
  }

  if (terrain === 'mountain') {
    defenderDRM += 2;
    breakdown.push('Mountain Terrain (Defender): +2');
  } else if (terrain === 'hill') {
    defenderDRM += 1;
    breakdown.push('Hill Terrain (Defender): +1');
  }

  // 8. Artillery Differential
  const artyDiff = attackerArty - defenderArty;
  let artyDRM = 0;
  if (['clear', 'rolling', 'rough'].includes(terrain)) {
    if (terrain === 'clear') {
      if (artyDiff >= 8) artyDRM = 2;
      else if (artyDiff >= 5) artyDRM = 1;
      else if (artyDiff <= -4) artyDRM = -3;
      else if (artyDiff <= -1) artyDRM = -2;
    } else if (terrain === 'rolling') {
      if (artyDiff >= 8) artyDRM = 1;
      else if (artyDiff >= 5) artyDRM = 1;
      else if (artyDiff <= -4) artyDRM = -2;
      else if (artyDiff <= -1) artyDRM = -1;
    } else if (terrain === 'rough') {
      if (artyDiff >= 8) artyDRM = 1;
      else if (artyDiff <= -4) artyDRM = -1;
    }
    if (artyDRM !== 0) {
      attackerDRM += artyDRM;
      breakdown.push(`Artillery DRM: ${artyDRM >= 0 ? '+' : ''}${artyDRM}`);
    }
  }

  // 9. Game-Specific Environmental & Special Modifiers
  if (isRain) { attackerDRM -= 1; breakdown.push('Rain Turn: -1'); }
  if (isDemoralized2) { attackerDRM -= 1; breakdown.push('Demoralized-2 Attacker: -1'); }
  
  // Union Panic Rule scoping
  if (isUnionPanic) {
    if (attackerSide === 'union') {
      attackerDRM -= 1;
      breakdown.push('Union Panic: -1');
    }
  }

  // 10. Differential and Lookup
  const modifiedAttRoll = attackerRoll + attackerDRM;
  const modifiedDefRoll = defenderRoll + defenderDRM;
  let netDiff = modifiedAttRoll - modifiedDefRoll;

  let lookupKey = netDiff;
  if (lookupKey < -8) lookupKey = -8;
  if (lookupKey > 10) lookupKey = 10;

  const resultRow = COMBAT_CHART[lookupKey.toString()] || ["-", "-"];

  return {
    attackerDRM,
    defenderDRM,
    modifiedAttRoll,
    modifiedDefRoll,
    netDiff,
    defenderResult: resultRow[0],
    attackerResult: resultRow[1],
    breakdown
  };
}
