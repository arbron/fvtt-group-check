import { BaseSystem } from './core.js';

/*
 * Skill Checks: Actor5e.rollSkill(skillId, options={})
 * Ability Checks: Actor5e.rollAbilityTest(abilityId, options={})
 * Saving Throws: Actor5e.rollAbilitySave(abilityId, options={})
 */

class Types {
  static SKILL = "skill";
  static SAVE = "save";
  static ABILITY = "ability";

  static sourceFor(type) {
    return (type == Types.SKILL ? "skills" : "abilities");
  }

  static localizationPrefixFor(type) {
    return (type == Types.SKILL ? "Skill" : "Ability");
  }
}

const check_data = {
  "abilities": [
    "str", "dex", "con", "int", "wis", "cha"
  ],
  "skills": [
    "acr", "ani", "arc", "ath", "dec", "his", "ins", "itm", "inv",
    "med", "nat", "prc", "prf", "per", "rel", "slt", "ste", "sur"
  ]
  // TODO: Add tool checks
  // TODO: Add support for custom skills
};

export default class SystemDnD5e extends BaseSystem {
  /**
   * Returns an object containing all of the valid checks
   * split into categories.
   */
  static allChecks() {
    return [Types.SKILL, Types.SAVE, Types.ABILITY].map(type => {
      return {
        type: type,
        label: SystemDnD5e._localizedLabelForType(type),
        checks: check_data[Types.sourceFor(type)].map(code => {
          return SystemDnD5e._checkDataForCode(type, code);
        })
      };
    });
  }

  static checkDataForAction(action) {
    const [type, code] = SystemDnD5e._splitAction(action);
    return SystemDnD5e._checkDataForCode(type, code);
  }

  static _checkDataForCode(type, code) {
    return {
      "action": `${type}.${code}`,
      "label": SystemDnD5e._localizedLabelForCheck(type, code),
      "buttonLabel": SystemDnD5e._buttonLabel(type, code)
    };
  }

  static rollCheckForActor(action, actor, displayChatMessage=false) {
    const [type, code] = SystemDnD5e._splitAction(action);
    if (type == Types.SKILL) {
      return actor.rollSkill(code, {chatMessage: displayChatMessage});
    } else if (type == Types.SAVE) {
      return actor.rollAbilityTest(code, {chatMessage: displayChatMessage});
    } else if (type == Types.ABILITY) {
      return actor.rollAbilitySave(code, {chatMessage: displayChatMessage});
    } else {
      return super.rollCheckForActor(action, actor, displayChatMessage);
    }
  }

  static _splitAction(action) {
    let split = action.split('.');
    let type = split.shift();
    let code = split.shift();
    return [type, code];
  }

  static _localizedLabelForType(type) {
    if (type == Types.SKILL) {
      return game.i18n.localize('GroupCheck.DND5E.ActionSkil');
    } else if (type == Types.SAVE) {
      return game.i18n.localize('DND5E.ActionSave');
    } else {
      return game.i18n.localize('DND5E.ActionAbil');
    }
  }

  static _buttonLabel(type, code) {
    switch (type) {
      case Types.SKILL:
        return SystemDnD5e._localizedLabelForCheck(type, code);
      case Types.SAVE:
        return game.i18n.format('DND5E.SavePromptTitle', {
          ability: SystemDnD5e._localizedLabelForCheck(type, code)
        });
      case Types.ABILITY:
        return game.i18n.format('DND5E.AbilityPromptTitle', {
          ability: SystemDnD5e._localizedLabelForCheck(type, code)
        });
    }
  }

  static _localizedLabelForCheck(type, code) {
    let prefix = Types.localizationPrefixFor(type);
    let formattedCode = code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();
    return game.i18n.localize(`DND5E.${prefix}${formattedCode}`);
  }
}
