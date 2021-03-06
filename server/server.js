'use strict';

require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const uuid = require('uuid/v4');

const port = process.env.PORT || 3000;
const privateKey = process.env.PRIVATE_KEY || 'secret';

const app = express();

app.use(cors());
app.options('*', (req, res) => res.sendStatus(204));
app.use(express.json());

const UserModel = {
  async findByEmail(email) {
    const usersFilePath = path.join(__dirname, 'data', 'users.json');
    const usersFileContent = await fs.readFile(usersFilePath);
    const users = JSON.parse(usersFileContent);

    return users.find(existingUser => existingUser.email === email);
  }
}

const ensureUserExists = (user) => {
  if (!user) {
    const error = new Error(`User with email ${email} not found`);
    error.code = 404;

    throw error;
  }
};

const ensurePasswordCorrect = (password, user) => {
  if (String(password) !== String(user.password)) {
    const error = new Error(`Invalid password`);
    error.code = 401;

    throw error;
  }
}

const removePasswordFromUser = (user) => {
  const {
    password,
    ...userWithoutPassword
  } = user;

  return userWithoutPassword;
}

const createToken = (email) => {
  return jwt.sign({ email }, privateKey);
}

const authService = {
  async signIn(email, password) {
    const user = await UserModel.findByEmail(email);

    ensureUserExists(user);
    ensurePasswordCorrect(password, user);

    const token = createToken(email);

    return [removePasswordFromUser(user), token];
  }
};

const authController = {
  async signIn(req, res) {
    const { email, password } = req.body;

    try {
      const [user, token] = await authService.signIn(email, password);

      res.setHeader('access-control-expose-headers', 'x-token');
      res.setHeader('x-token', token);

      res.json(user);
    } catch (error) {
      res.status(error.code).send(error.message);
    }
  }
};

app.post('/sign-in', authController.signIn);

app.post('/sign-up', async(req, res) => {
  const { repeatPassword, ...user } = req.body;

  if (!user.email || !user.password || repeatPassword !== user.password) {
    res.sendStatus(400);

    return;
  }

  const usersFilePath = path.join(__dirname, 'data', 'users.json');
  const usersFileContent = await fs.readFile(usersFilePath);
  const users = JSON.parse(usersFileContent);

  const userWithSameEmail = users
    .find(existingUser => existingUser.email === user.email);

  if (userWithSameEmail) {
    res.sendStatus(400);

    return;
  }

  user.id = uuid();
  user.password = String(user.password);

  users.push(user);

  await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));

  const token = jwt.sign({ email: user.email }, privateKey);

  res.setHeader('access-control-expose-headers', 'x-token');
  res.setHeader('x-token', token);

  const { password: userPassword, ...userWithoutPassword } = user;

  res.json(userWithoutPassword);
});

app.get('/comments', async(req, res) => {
  const token = req.header('Authorization');

  if (!token) {
    res.sendStatus(401);

    return;
  }

  let userDataFromToken;

  try {
    userDataFromToken = jwt.verify(token, privateKey);
  } catch (error) {
    res.sendStatus(401);

    return;
  }

  const { email } = userDataFromToken;

  const usersFilePath = path.join(__dirname, 'data', 'users.json');
  const usersFileContent = await fs.readFile(usersFilePath);
  const users = JSON.parse(usersFileContent);

  const user = users.find(existingUser => existingUser.email === email);

  if (!user) {
    res.sendStatus(404);

    return;
  }

  const commentsFilePath = path.join(__dirname, 'data', 'comments.json');
  const commentsFileContent = await fs.readFile(commentsFilePath);
  const comments = JSON.parse(commentsFileContent);

  const userComments = comments.filter(({ userId }) => user.id === userId);

  res.json(userComments);
});

app.patch('/comments/:commentId', (req, res) => {
  res.send('patch:comments/:commentId');

  const filePath = path.join(__dirname, `../data/${req.params.commentId}.json`);
  let data;

  try {
    data = JSON.parse(fs.readFileSync(filePath));
  } catch (e) {
    res.status(404)
      .send('Not found');
  }

  const newData = {
    ...data, ...req.body,
  };

  fs.writeFileSync(filePath, JSON.stringify(newData));
  res.json(newData);
});

app.patch('/posts/:id', (req, res) => {
  res.send(`Post with id:${req.params.id} is updated`);
});

app.get('/posts', async (req, res) => {
  const postsFilePath = path.join(__dirname, 'data', 'posts.json');
  const postsFileContent = await fs.readFile(postsFilePath);
  const posts = JSON.parse(postsFileContent);

  res.json(posts);
});

app.get('/users', async(req, res) => {
  const usersContent = await fs.readFile('./data/users.json');
  const users = JSON.parse(usersContent);

  res.json(users);
});

// eslint-disable-next-line no-console
app.listen(port, () => console.log(`Server listening on port ${port}`));
