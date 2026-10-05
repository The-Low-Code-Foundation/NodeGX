var words = use('engine/words');

exports.hello = function (name) {
  return words.hi + ', ' + name + '!';
};
