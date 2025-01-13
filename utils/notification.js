const Notification = require("../models/notification");
const createLikeNotification = async (
  postId,
  likerId,
  postAuthorId,
  message
) => {
  if (likerId.toString() === postAuthorId.toString()) return; // Don't notify if user likes their own post

  await Notification.create({
    recipient: postAuthorId,
    sender: likerId,
    type: "LIKE",
    post: postId,
    message,
  });
};

const createCommentNotification = async (
  postId,
  commenterId,
  postAuthorId,
  message
) => {
  if (commenterId.toString() === postAuthorId.toString()) return; // Don't notify if user comments on their own post

  await Notification.create({
    recipient: postAuthorId,
    sender: commenterId,
    type: "COMMENT",
    post: postId,
    message,
  });
};

const createSubscribeNotification = async (followerId, followeeId, message) => {
  await Notification.create({
    recipient: followeeId,
    sender: followerId,
    type: "SUBSCRIBE",
    message,
  });
};

const createMentionNotification = async (
  postId,
  mentionerId,
  postAuthorId,
  message
) => {
  await Notification.create({
    recipient: postAuthorId,
    sender: mentionerId,
    type: "MENTION",
    post: postId,
    message,
  });
};
const createNewPostNotification = async (postId, postAuthorId, message) => {
  await Notification.create({
    recipient: postAuthorId,
    sender: postAuthorId,
    type: "NEW_POST",
    post: postId,
    message,
  });
};

const createCommentLikeNotification = async (
  commentId,
  likerId,
  commentAuthorId,
  message
) => {};

module.exports = {
  createLikeNotification,
  createCommentNotification,
  createSubscribeNotification,
  createMentionNotification,
  createNewPostNotification,
  createCommentLikeNotification,
};
