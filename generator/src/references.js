const prompt = require('./prompt');
const { readLocalDirectory } = require('./source');
const { validateCamelUpper } = require('./validations');
const { getCamelLower, getPlural } = require('./lang');
const { assertPath } = require('./util');

const MODELS_DIR = 'services/api/src/models';
const MODEL_NAME_REG = /mongoose.(?:models.|model\(')(\w+)/;

async function getPrimaryReference(options) {
  const modelNames = await getModelNames(options);

  const selection = await prompt({
    type: 'select',
    name: 'primaryReference',
    instructions: false,
    message: 'Primary Reference:',
    choices: modelNames.map((name) => {
      return {
        title: name,
        value: name,
        description: `Creates a ${name} reference in the Edit${options.camelUpper} modal.`,
      };
    }).concat({
      title: 'Other',
      value: 'other',
      description: `Manually enter a reference for the Edit${options.camelUpper} modal.`,
    }),
    hint: 'Select',
  });

  let camelUpper;
  if (selection === 'other') {
    camelUpper = await prompt({
      type: 'text',
      name: 'primaryReferencePlural',
      validate: validateCamelUpper,
      message: 'Ref (ex. UserImage):',
    });
  } else {
    camelUpper = selection;
  }

  const camelLower = getCamelLower(camelUpper);

  return {
    camelLower,
    camelUpper,
  };
}

async function getSecondaryReferences(options) {
  const { camelUpper } = options;

  const references = [];

  const modelNames = await getModelNames(options);

  let selectedNames = await prompt({
    type: 'multiselect',
    name: 'secondaryReferences',
    instructions: false,
    message: 'Secondary References:',
    choices: modelNames.map((name) => {
      return {
        title: name,
        value: name,
        description: `Generates a ${camelUpper}${getPlural(name)} screen.`,
      };
    }).concat({
      title: 'Other',
      value: 'other',
      description: `Manually enter other references.`,
    }),
    hint: 'Space to select',
  });

  if (selectedNames.includes('other')) {
    const otherNames = await prompt({
      type: 'list',
      message: 'Comma separated refs (ex. Video, UserImage):',
      validate: (str) => {
        const arr = str.split(/,\s*/);
        for (let el of arr) {
          if (validateCamelUpper(el) !== true) {
            return 'Please enter names in upper camel case.';
          }
        }
        return true;
      },
    });

    selectedNames = selectedNames.filter((name) => name !== 'other');
    selectedNames = selectedNames.concat(otherNames);
  }

  for (let camelUpper of selectedNames) {
    const pluralUpper = await prompt({
      type: 'text',
      name: `${camelUpper}Plural`,
      validate: validateCamelUpper,
      initial: getPlural(camelUpper),
      message: `Confirm plural name for ${camelUpper}:`,
    });
    const camelLower = getCamelLower(camelUpper);
    const pluralLower = getCamelLower(pluralUpper);
    references.push({
      camelLower,
      camelUpper,
      pluralLower,
      pluralUpper,
    });
  }

  return references;
}

async function getModelNames(options) {
  const { camelUpper } = options;

  const modelsDir = await assertPath(MODELS_DIR);

  return (await readLocalDirectory(modelsDir))
    .map((source) => {
      const match = source.match(MODEL_NAME_REG);
      return match && match[1];
    })
    .filter((name) => {
      return name && name !== camelUpper;
    });
}

module.exports = {
  getPrimaryReference,
  getSecondaryReferences,
};