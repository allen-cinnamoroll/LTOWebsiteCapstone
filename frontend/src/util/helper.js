/**
 *
 * @param {*} str
 * @returns
 */
export const capitalizeFirstLetter = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getFullName = (firstName, lastName, middleName) => {
  const middleInitial = middleName ? `${middleName.charAt(0)}. ` : "";
  return `${firstName} ${middleInitial}${lastName}`.trim();
};

/**
 *
 * @param {object} categories
 * @returns
 */
export const createCategoryMap = (categories) => ({
  get: (key) => categories[key] || null,
});
