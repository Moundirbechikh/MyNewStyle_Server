const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const transporter = require('../config/Email');
const { verificationEmailTemplate } = require('../utils/emailTemplates');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (user, code) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: 'Confirmez votre compte MyNewStyle',
    html: verificationEmailTemplate({ nom: user.nom, code }),
  });
};

// POST /api/auth/register
// Crée le compte en état NON vérifié et envoie un code par email.
// Ne connecte PAS l'utilisateur — il doit d'abord valider le code.
const registerUser = async (req, res) => {
  try {
    const { nom, email, password, adresse, telephone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Un compte existe déjà avec cet email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const code = generateCode();
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = await User.create({
      nom,
      email,
      password: hashedPassword,
      adresse,
      telephone,
      isVerified: false,
      verificationCode: code,
      verificationCodeExpires: codeExpires,
    });

    try {
      await sendVerificationEmail(user, code);
    } catch (emailError) {
      console.error('Erreur envoi email de vérification:', emailError.message);
      // On ne bloque pas l'inscription si l'email échoue à partir,
      // l'utilisateur pourra demander un renvoi du code.
    }

    res.status(201).json({
      message: 'Compte créé. Vérifiez votre email pour activer votre compte.',
      email: user.email,
      needsVerification: true,
    });
  } catch (error) {
    console.error('Erreur registerUser:', error);
    res.status(400).json({ message: error.message });
  }
};

// POST /api/auth/verify-email
// body: { email, code }
// Valide le code, active le compte, et connecte automatiquement l'utilisateur
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Compte introuvable' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Ce compte est déjà vérifié' });
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      return res.status(400).json({ message: 'Aucun code en attente. Demandez un nouveau code.' });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ message: 'Ce code a expiré. Demandez un nouveau code.' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: 'Code incorrect' });
    }

    await User.findByIdAndUpdate(user._id, {
      isVerified: true,
      $unset: { verificationCode: '', verificationCodeExpires: '' },
    });

    res.json({
      _id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Erreur verifyEmail:', error);
    res.status(400).json({ message: error.message });
  }
};

// POST /api/auth/resend-code
// body: { email }
const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Compte introuvable' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Ce compte est déjà vérifié' });
    }

    const code = generateCode();
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      verificationCode: code,
      verificationCodeExpires: codeExpires,
    });

    await sendVerificationEmail(user, code);

    res.json({ message: 'Un nouveau code a été envoyé' });
  } catch (error) {
    console.error('Erreur resendVerificationCode:', error);
    res.status(400).json({ message: error.message });
  }
};

// POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Compte pas encore vérifié : on bloque la connexion
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Compte non vérifié. Vérifiez votre email pour activer votre compte.',
        needsVerification: true,
        email: user.email,
      });
    }

    res.json({
      _id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me (protégé)
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  verifyEmail,
  resendVerificationCode,
};