import constants from './shared/constants.js';
import GroupCheck from './GroupCheck.js';


export class CreateGroupCheck extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: game.i18n.localize('GroupCheck.CreateCheck'),
      id: 'create-group-check',
      template: `${constants.templateRoot}/create-check.html`,
      width: 680,
      height: 500,
      classes: ['groupCheck-create']
    });
  }

  /** @override */
  get isEditable() {
    return true;
  }

  /** @override */
  getData(options) {
    const checks = game.groupCheck.system.allChecks();
    return { sections: checks };
  }

  _updateObject(event, data) {
    let groupCheck = {
      title: data.title,
      description: data.description,
      check_codes: []
    }
    for (let [name, value] of Object.entries(data)) {
      if (!name.startsWith('action-')) continue;
      if (!value) continue;
      groupCheck.check_codes.push(name.slice(7));
    }
    GroupCheck.create(groupCheck);
  }
}
