// import constants from './shared/constants.js';
import { log } from './shared/messages.js';
// import registerSettings from './settings.js';
import GroupCheckCommand from './GroupCheckCommand.js';

// const preloadTemplates = () => {
//   const templatePaths = [
//     `${constants.templateRoot}/chat-card.html`,
//   ];
//   return loadTemplates(templatePaths);
// };

Hooks.on('init', () => {
  log('Initializing the Group Checks module');

  GroupCheckCommand.registerCommand();

  // registerSettings();
  // preloadTemplates();
});

Hooks.on('setup', () => {
  log('Setup');
});

Hooks.on('ready', () => {
  log('Ready');
});

// Hooks.on('renderChatLog', () => {
//   
// });
// 
// Hooks.on('renderChatPopout', () => {
//   
// });
