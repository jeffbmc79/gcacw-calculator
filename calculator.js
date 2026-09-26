function calculateCombat(params) {
  const {
    attackerCV, defenderCV,
    attackerArty, defenderArty,
    attackerTactical, defenderTactical,
    actionType, terrain, hexside
  } = params;

  let attackerDRM = 0;
  let defenderDRM = 0;
  const breakdown = [];

  // Ratio Modifier
  const ratio = attackerCV / defenderCV;
  let ratioDRM = 0;
  if (ratio >= 4) ratioDRM = 4;
  else if (ratio >= 3) ratioDRM = 3;
  else if (ratio >= 2) ratioDRM = 2;
  else if (ratio >= 1.5) ratioDRM = 1;
  else if (ratio >= 1) ratioDRM = 0;
  else if (ratio >= 0.5) ratioDRM = -1;
  else ratioDRM = -2;

  attackerDRM += ratioDRM;
  breakdown.push(`Ratio (${ratio.toFixed(2)}:1): ${ratioDRM >= 0 ? '+' : ''}${ratioDRM}`);

  // Action Type
  if (actionType === 'assault') {
    attackerDRM += 1;
    breakdown.push('Assault Action: +1');
  }

  // Tactical Differential
  const tacticalDiff = attackerTactical - defenderTactical;
  attackerDRM += tacticalDiff;
  breakdown.push(`Tactical Differential (${attackerTactical} vs ${defenderTactical}): ${tacticalDiff >= 0 ? '+' : ''}${tacticalDiff}`);

  // Terrain & Hexside Modifiers
  if (hexside === 'creek') {
    defenderDRM += 1;
    breakdown.push('Creek Hexside (Defender): +1');
  } else if (hexside === 'bridge' || hexside === 'ford') {
    defenderDRM += 2;
    breakdown.push('Bridge/Ford Hexside (Defender): +2');
  }

  if (terrain === 'mountain') {
    defenderDRM += 2;
    breakdown.push('Mountain Terrain (Defender): +2');
  } else if (terrain === 'hill') {
    defenderDRM += 1;
    breakdown.push('Hill Terrain (Defender): +1');
  }

  // Artillery Differential
  const artyDiff = attackerArty - defenderArty;
  let artyDRM = 0;
  if (terrain === 'clear') {
    if (artyDiff >= 8) artyDRM = 2;
    else if (artyDiff >= 5) artyDRM = 1;
    else if (artyDiff >= 2) artyDRM = 0;
    else if (artyDiff >= -3) artyDRM = -2;
    else artyDRM = -3;
  }
  attackerDRM += artyDRM;
  breakdown.push(`Artillery DRM (${artyDiff >= 0 ? '+' : ''}${artyDiff} in ${terrain}): ${artyDRM >= 0 ? '+' : ''}${artyDRM}`);

  return {
    attackerDRM,
    defenderDRM,
    netDiff: attackerDRM - defenderDRM,
    breakdown
  };
}
