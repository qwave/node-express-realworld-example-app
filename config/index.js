module.exports = {
  secret: process.env.NODE_ENV === 'production' ? process.env.SECRET : 'secret',
  GAME_START_DATE: '2022-07-04'
};
