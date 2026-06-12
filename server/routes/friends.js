const router = require('express').Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const user = await User.findById(req.user.userId).select('friends friendCode');
  res.json(user);
});

router.post('/add', async (req, res) => {
  try {
    const { friendCode } = req.body;
    if (!friendCode) return res.status(400).json({ error: 'Missing friendCode' });
    const friend = await User.findOne({ friendCode: friendCode.toUpperCase() });
    if (!friend) return res.status(404).json({ error: 'User not found' });
    if (friend._id.equals(req.user.userId)) return res.status(400).json({ error: 'Cannot add yourself' });
    const me = await User.findById(req.user.userId);
    if (me.friends.some(f => f.userId.equals(friend._id))) {
      return res.status(400).json({ error: 'Already friends' });
    }
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { friends: { userId: friend._id, username: friend.username } }
    });
    await User.findByIdAndUpdate(friend._id, {
      $push: { friends: { userId: me._id, username: me.username } }
    });
    res.json({ success: true, friend: { userId: friend._id, username: friend.username } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:friendId', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { friends: { userId: req.params.friendId } }
    });
    await User.findByIdAndUpdate(req.params.friendId, {
      $pull: { friends: { userId: req.user.userId } }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
