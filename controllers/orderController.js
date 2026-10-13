const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const transporter = require("../config/Email");
const {
  orderConfirmationEmailTemplate,
  adminOrderNotificationTemplate,
} = require("../utils/emailTemplates");

const sendOrderEmails = async ({
  order,
  customerEmail,
  customerName,
  telephone,
  adresseLivraison,
  ville,
  notes,
}) => {
  const orderId = order._id.toString().slice(-6).toUpperCase();
  const adminEmail =
    process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;

  if (!customerEmail) {
    throw new Error(
      "Impossible d’envoyer l’email de confirmation : email client introuvable.",
    );
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: customerEmail,
    subject: `Confirmation de votre commande MyNewStyle #${orderId}`,
    html: orderConfirmationEmailTemplate({
      nom: customerName,
      orderId,
      items: order.items,
      total: order.total,
      adresseLivraison,
      ville,
      telephone,
    }),
  });

  if (adminEmail) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: adminEmail,
      subject: `Nouvelle commande #${orderId}`,
      html: adminOrderNotificationTemplate({
        nomDestinataire: customerName,
        email: customerEmail,
        telephone,
        items: order.items,
        total: order.total,
        adresseLivraison,
        ville,
        notes,
        orderId,
      }),
    });
  }
};

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { nomDestinataire, telephone, adresseLivraison, ville, notes } =
      req.body;

    console.log("🧾 Début création commande", {
      userId: req.user?._id,
      email: req.user?.email,
      itemsCount: req.body?.items?.length || "cart",
    });

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      console.log("❌ Commande refusée: panier vide");
      return res.status(400).json({ message: "Votre panier est vide" });
    }

    const productsCache = {};

    for (const item of cart.items) {
      let product = productsCache[item.product.toString()];
      if (!product) {
        product = await Product.findById(item.product);
        productsCache[item.product.toString()] = product;
      }
      if (!product) {
        console.log(
          "❌ Produit introuvable au moment de la commande:",
          item.product,
        );
        return res
          .status(400)
          .json({ message: `Le produit "${item.name}" n'existe plus.` });
      }
      const colorObj = product.colors.find((c) => c.name === item.color);
      if (!colorObj) {
        console.log("❌ Couleur indisponible:", item.color, "pour", item.name);
        return res
          .status(400)
          .json({
            message: `La couleur "${item.color}" n'est plus disponible pour "${item.name}".`,
          });
      }
      const currentStock = colorObj.stockBySize.get(item.size) ?? 0;
      if (currentStock < item.quantity) {
        console.log("❌ Stock insuffisant:", {
          product: item.name,
          color: item.color,
          size: item.size,
          currentStock,
          requested: item.quantity,
        });
        return res.status(400).json({
          message: `Stock insuffisant pour "${item.name}" (${item.color}, taille ${item.size}). Il ne reste que ${currentStock} en stock.`,
        });
      }
    }

    const total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    console.log(
      "📧 Tentative d’envoi des emails avant enregistrement commande...",
    );
    try {
      await sendOrderEmails({
        order: {
          _id: "TMP_ORDER",
          items: cart.items,
          total,
        },
        customerEmail: req.user.email,
        customerName: nomDestinataire,
        telephone,
        adresseLivraison,
        ville,
        notes,
      });
      console.log(
        "✅ Emails envoyés avec succès, création de la commande en base...",
      );
    } catch (emailError) {
      console.error(
        "❌ Erreur envoi email avant création commande:",
        emailError.message,
      );
      return res.status(400).json({
        message:
          "La commande n’a pas pu être validée car l’email de confirmation n’a pas pu être envoyé. Aucune commande n’a été enregistrée.",
      });
    }

    const order = await Order.create({
      user: req.user._id,
      items: cart.items,
      total,
      nomDestinataire,
      telephone,
      adresseLivraison,
      ville,
      notes,
    });

    console.log("✅ Commande enregistrée en base:", order._id);

    for (const item of cart.items) {
      const product = productsCache[item.product.toString()];
      const colorObj = product.colors.find((c) => c.name === item.color);
      const currentStock = colorObj.stockBySize.get(item.size) ?? 0;
      colorObj.stockBySize.set(
        item.size,
        Math.max(currentStock - item.quantity, 0),
      );
      product.markModified("colors");
      await product.save();
    }

    cart.items = [];
    await cart.save();

    console.log("🛒 Panier vidé après commande OK");
    res.status(201).json(order);
  } catch (error) {
    console.error("Erreur création commande:", error.message);
    res.status(400).json({ message: error.message });
  }
};

/*
Ancienne logique remplacée :

const createOrder = async (req, res) => {
  try {
    const { nomDestinataire, telephone, adresseLivraison, ville, notes } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Votre panier est vide' });
    }

    const productsCache = {};

    for (const item of cart.items) {
      let product = productsCache[item.product.toString()];
      if (!product) {
        product = await Product.findById(item.product);
        productsCache[item.product.toString()] = product;
      }
      if (!product) {
        return res.status(400).json({ message: `Le produit "${item.name}" n'existe plus.` });
      }
      const colorObj = product.colors.find((c) => c.name === item.color);
      if (!colorObj) {
        return res.status(400).json({ message: `La couleur "${item.color}" n'est plus disponible pour "${item.name}".` });
      }
      const currentStock = colorObj.stockBySize.get(item.size) ?? 0;
      if (currentStock < item.quantity) {
        return res.status(400).json({
          message: `Stock insuffisant pour "${item.name}" (${item.color}, taille ${item.size}). Il ne reste que ${currentStock} en stock.`,
        });
      }
    }

    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await Order.create({
      user: req.user._id,
      items: cart.items,
      total,
      nomDestinataire,
      telephone,
      adresseLivraison,
      ville,
      notes,
    });

    for (const item of cart.items) {
      const product = productsCache[item.product.toString()];
      const colorObj = product.colors.find((c) => c.name === item.color);
      const currentStock = colorObj.stockBySize.get(item.size) ?? 0;
      colorObj.stockBySize.set(item.size, Math.max(currentStock - item.quantity, 0));
      product.markModified('colors');
      await product.save();
    }

    cart.items = [];
    await cart.save();

    try {
      await sendOrderEmails({
        order,
        customerEmail: req.user.email,
        customerName: nomDestinataire,
        telephone,
        adresseLivraison,
        ville,
        notes,
      });
    } catch (emailError) {
      console.error('❌ Erreur envoi email commande:', emailError.message);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Erreur création commande:', error.message);
    res.status(400).json({ message: error.message });
  }
};
*/

// GET /api/orders/my-orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/orders — ADMIN, toutes les commandes + recherche + filtre statut
const getAllOrders = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status && status !== "all") filter.statut = status;

    let orders = await Order.find(filter)
      .populate("user", "nom email")
      .sort({ createdAt: -1 });

    if (search && search.trim() !== "") {
      const term = search.trim().toLowerCase();
      orders = orders.filter(
        (o) =>
          o._id.toString().toLowerCase().includes(term) ||
          o.nomDestinataire.toLowerCase().includes(term) ||
          (o.user?.nom || "").toLowerCase().includes(term) ||
          (o.user?.email || "").toLowerCase().includes(term) ||
          o.items.some((item) => item.name.toLowerCase().includes(term)),
      );
    }

    res.json(orders);
  } catch (error) {
    console.error("Erreur getAllOrders:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/stats — ADMIN, statistiques complètes (revenu mensuel/annuel, annulations, retours)
// query optionnel : ?year=2026
const getOrderStats = async (req, res) => {
  try {
    const requestedYear = req.query.year
      ? Number(req.query.year)
      : new Date().getFullYear();
    const allOrders = await Order.find();

    const yearsSet = new Set(
      allOrders.map((o) => new Date(o.createdAt).getFullYear()),
    );
    yearsSet.add(new Date().getFullYear()); // l'année en cours est toujours disponible
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

    const monthLabels = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthLabel: monthLabels[i],
      revenue: 0,
      orders: 0,
      cancelled: 0,
      returned: 0,
    }));

    let yearlyRevenue = 0;
    let yearlyOrders = 0;
    let yearlyCancelled = 0;
    let yearlyReturned = 0;

    const now = new Date();
    const currentMonth = { revenue: 0, orders: 0, cancelled: 0, returned: 0 };

    allOrders.forEach((order) => {
      const d = new Date(order.createdAt);
      const y = d.getFullYear();
      const m = d.getMonth();
      const isCancelled = order.statut === "annulee";
      const isReturned = order.statut === "retournee";
      const countsAsRevenue = !isCancelled && !isReturned;

      if (y === requestedYear) {
        monthly[m].orders += 1;
        if (isCancelled) monthly[m].cancelled += 1;
        if (isReturned) monthly[m].returned += 1;
        if (countsAsRevenue) monthly[m].revenue += order.total;

        yearlyOrders += 1;
        if (isCancelled) yearlyCancelled += 1;
        if (isReturned) yearlyReturned += 1;
        if (countsAsRevenue) yearlyRevenue += order.total;
      }

      if (y === now.getFullYear() && m === now.getMonth()) {
        currentMonth.orders += 1;
        if (isCancelled) currentMonth.cancelled += 1;
        if (isReturned) currentMonth.returned += 1;
        if (countsAsRevenue) currentMonth.revenue += order.total;
      }
    });

    // Totaux par année (pour le récap mobile "par année")
    const yearlyBreakdown = availableYears.map((year) => {
      let revenue = 0;
      let orders = 0;
      let cancelled = 0;
      let returned = 0;
      allOrders.forEach((order) => {
        if (new Date(order.createdAt).getFullYear() === year) {
          orders += 1;
          const isCancelled = order.statut === "annulee";
          const isReturned = order.statut === "retournee";
          if (isCancelled) cancelled += 1;
          if (isReturned) returned += 1;
          if (!isCancelled && !isReturned) revenue += order.total;
        }
      });
      return { year, revenue, orders, cancelled, returned };
    });

    // Mois avec le plus d'annulations + retours cumulés (alerte pour l'admin)
    let worstMonth = null;
    monthly.forEach((m) => {
      const issues = m.cancelled + m.returned;
      if (
        issues > 0 &&
        (!worstMonth || issues > worstMonth.cancelled + worstMonth.returned)
      ) {
        worstMonth = m;
      }
    });

    res.json({
      year: requestedYear,
      availableYears,
      monthly,
      yearlyTotal: {
        revenue: yearlyRevenue,
        orders: yearlyOrders,
        cancelled: yearlyCancelled,
        returned: yearlyReturned,
      },
      currentMonth,
      yearlyBreakdown,
      worstMonth,
    });
  } catch (error) {
    console.error("Erreur getOrderStats:", error);
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/orders/:id/status — ADMIN
const updateOrderStatus = async (req, res) => {
  try {
    const { statut } = req.body;
    const validStatuses = [
      "en_attente",
      "confirmee",
      "expediee",
      "livree",
      "annulee",
      "retournee",
    ];

    if (!validStatuses.includes(statut)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true },
    ).populate("user", "nom email");
    if (!order)
      return res.status(404).json({ message: "Commande non trouvée" });

    res.json(order);
  } catch (error) {
    console.error("Erreur updateOrderStatus:", error);
    res.status(400).json({ message: error.message });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "nom email",
    );
    if (!order)
      return res.status(404).json({ message: "Commande non trouvée" });

    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  getOrderById,
};
