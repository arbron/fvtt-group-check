/*
 * Skill Checks: Actor5e.rollSkill(skillId, options={})
 * Ability Checks: Actor5e.rollAbilityTest(abilityId, options={})
 * Saving Throws: Actor5e.rollAbilitySave(abilityId, options={})
 */

const check_data = {
  'abilities': [
    { "abilityId": "str", "label": "Strength" },
    { "abilityId": "dex", "label": "Dexterity" },
    { "abilityId": "con", "label": "Constitution" },
    { "abilityId": "int", "label": "Intelligence" },
    { "abilityId": "wis", "label": "Wisdom" },
    { "abilityId": "cha", "label": "Charisma" }
  ],
  'skills': [
    { "skillId": "acr", "label": "Acrobatics" },
    { "skillId": "ani", "label": "Animal Handling" },
    { "skillId": "arc", "label": "Arcana" },
    { "skillId": "ath", "label": "Athletics" },
    { "skillId": "dec", "label": "Deception" },
    { "skillId": "his", "label": "History" },
    { "skillId": "ins", "label": "Insight" },
    { "skillId": "itm", "label": "Intimidation" },
    { "skillId": "inv", "label": "Investigation" },
    { "skillId": "med", "label": "Medicine" },
    { "skillId": "nat", "label": "Nature" },
    { "skillId": "prc", "label": "Perception" },
    { "skillId": "prf", "label": "Performance" },
    { "skillId": "per", "label": "Persuasion" },
    { "skillId": "rel", "label": "Religion" },
    { "skillId": "sit", "label": "Slight of Hand" },
    { "skillId": "ste", "label": "Stealth" },
    { "skillId": "sur", "label": "Survival" }
  ]
};
