(function () {
  "use strict";

  var storageKey = "gamers-stop-products";
  var cartStorageKey = "gamers-stop-cart";
  var activeProducts = [];
  var wiredSearchInputs = new WeakSet();
  var wiredSearchResultLists = new WeakSet();
  var scriptUrl = document.currentScript && document.currentScript.src;
  var siteRoot = new URL(".", scriptUrl || window.location.href);

  function siteUrl(path) {
    return new URL(String(path).replace(/^\/+/, ""), siteRoot).href;
  }

  function sitePath(path) {
    return new URL(String(path).replace(/^\/+/, ""), siteRoot).pathname;
  }

  function isSitePage(path) {
    return window.location.pathname === sitePath(path) ||
      window.location.pathname === sitePath(path + ".html");
  }

  function productPath(link) {
    if (!link) return "";
    var url = new URL(link.getAttribute("href"), window.location.href);
    var isProductLink = url.pathname === sitePath("product.html") || url.pathname === sitePath("index.html");
    var path = isProductLink ? url.searchParams.get("url") : url.pathname;
    var productsIndex = path ? path.indexOf("/products/") : -1;
    if (productsIndex > 0) path = path.slice(productsIndex);
    return path && path.indexOf("/products/") === 0 ? path : "";
  }

  function readProducts(documentToRead) {
    return Array.from(documentToRead.querySelectorAll(".product-item")).map(function (card) {
      var titleLink = card.querySelector(".product-item__title");
      var imageLink = card.querySelector(".product-item__image-wrapper");
      var path = productPath(titleLink) || productPath(imageLink);
      var price = card.querySelector(".product-item__price-list");
      var priceText = "";

      if (price) {
        var priceCopy = price.cloneNode(true);
        priceCopy.querySelectorAll(".visually-hidden").forEach(function (node) {
          node.remove();
        });
        priceText = priceCopy.textContent.replace(/\s+/g, " ").trim();
      }

      var image = card.querySelector("img");
      var imageSource = image && (image.getAttribute("data-src") || image.getAttribute("src"));
      if (imageSource) {
        imageSource = imageSource.replace("{width}", "600");
        if (imageSource.indexOf("//") === 0) imageSource = window.location.protocol + imageSource;
      }

      if (!path || !titleLink || !titleLink.textContent.trim()) return null;
      return {
        path: path,
        title: titleLink.textContent.trim(),
        price: priceText || "Price unavailable",
        image: imageSource || "",
        description: ""
      };
    }).filter(Boolean);
  }

  function mergeProducts(first, second) {
    var products = new Map();
    first.concat(second).forEach(function (product) {
      if (product && product.path) products.set(product.path, product);
    });
    return Array.from(products.values());
  }

  function saveProducts(products) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(products));
    } catch (error) {
      console.error("Could not save the product catalog.", error);
    }
  }

  function storedProducts() {
    try {
      var value = window.localStorage.getItem(storageKey);
      var products = value ? JSON.parse(value) : [];
      return Array.isArray(products) ? products : [];
    } catch (error) {
      console.error("Could not read the product catalog.", error);
      return [];
    }
  }

  async function loadProducts() {
    var products = mergeProducts(storedProducts(), readProducts(document));
    var response = await fetch(siteUrl("product-catalog.json?v=20261016-4"), { credentials: "same-origin" });
    if (!response.ok) throw new Error("Product catalog request failed: " + response.status);
    var catalog = await response.json();
    if (!Array.isArray(catalog)) throw new Error("Product catalog has an invalid format.");
    products = mergeProducts(products, catalog);
    saveProducts(products);
    return products;
  }

  function productLink(product) {
    return siteUrl("index.html?url=" + encodeURIComponent(product.path));
  }

  function whatsAppOrderLink(cart) {
    var subtotal = 0;
    var lines = cart.map(function (item) {
      var lineTotal = priceAmount(item.price) * item.quantity;
      subtotal += lineTotal;
      return "- " + item.title + " (Qty: " + item.quantity + ") — " + item.price +
        " each, line total " + formatTotal(lineTotal);
    });
    var message = "Hello! I would like to order:\n" + lines.join("\n") +
      "\nSubtotal: " + formatTotal(subtotal) +
      "\nPlease confirm availability and delivery details.";
    var link = document.createElement("a");
    link.href = "https://wa.me/96176054074?text=" + encodeURIComponent(message);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "button button--primary button--full local-whatsapp-link";
    link.textContent = "Contact us on WhatsApp";
    return link;
  }

  function addFloatingWhatsAppButton() {
    if (document.querySelector(".local-whatsapp-float")) return;
    var link = document.createElement("a");
    link.className = "local-whatsapp-float";
    link.href = "https://wa.me/96176054074";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Chat with us on WhatsApp");
    link.title = "Chat with us on WhatsApp";

    var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 32 32");
    icon.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", "M16 .8A15.1 15.1 0 0 0 3.1 23.7L1 31l7.5-2A15.2 15.2 0 1 0 16 .8zm0 27.5c-2.4 0-4.7-.6-6.7-1.9l-.5-.3-4.4 1.2 1.2-4.3-.3-.5A12.4 12.4 0 1 1 16 28.3zm6.8-9.3c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.3.4-1 1.2-1.2 1.5-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.6.1-.2 0-.5 0-.7-.1-.2-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.4 1.3-1.4 3.1s1.4 3.5 1.6 3.8c.2.2 2.7 4.1 6.5 5.7.9.4 1.6.6 2.1.7.9.3 1.7.2 2.3.1.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5z");
    icon.appendChild(path);
    link.appendChild(icon);
    document.body.appendChild(link);
  }

  function readCart() {
    try {
      var value = window.localStorage.getItem(cartStorageKey);
      var cart = value ? JSON.parse(value) : [];
      if (!Array.isArray(cart)) throw new Error("Saved cart has an invalid format.");
      return cart.filter(function (item) {
        return item && typeof item.path === "string" &&
          Number.isSafeInteger(item.quantity) && item.quantity > 0;
      });
    } catch (error) {
      console.error("Could not read the saved cart.", error);
      return [];
    }
  }

  function clearCartOnReload() {
    var navigation = window.performance.getEntriesByType("navigation")[0];
    if (!navigation || navigation.type !== "reload") return;
    try {
      window.localStorage.removeItem(cartStorageKey);
    } catch (error) {
      console.error("Could not clear the cart after refresh.", error);
      showCartNotice("The saved cart could not be cleared after refresh.");
    }
  }

  function saveCart(cart) {
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
      updateCartCount(cart);
      return true;
    } catch (error) {
      console.error("Could not save the cart.", error);
      showCartNotice("Your browser could not save the cart. Check storage settings and try again.");
      return false;
    }
  }

  function updateCartCount(cart) {
    var count = cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
    document.querySelectorAll(".header__cart-count").forEach(function (element) {
      element.textContent = String(count);
    });
    renderMiniCart(cart);
  }

  function renderMiniCart(cart) {
    var miniCart = document.querySelector("#mini-cart");
    var content = miniCart && miniCart.querySelector(".mini-cart__content");
    if (!miniCart || !content) return;
    miniCart.dataset.itemCount = String(cart.reduce(function (sum, item) {
      return sum + item.quantity;
    }, 0));
    content.replaceChildren();

    if (!cart.length) {
      content.classList.add("mini-cart__content--empty");
      var empty = document.createElement("p");
      empty.className = "local-mini-cart__empty";
      empty.textContent = "Your cart is empty";
      var shop = document.createElement("a");
      shop.href = siteUrl("");
      shop.className = "button button--primary button--full";
      shop.textContent = "Shop our products";
      content.append(empty, shop);
      return;
    }

    content.classList.remove("mini-cart__content--empty");
    var items = document.createElement("div");
    items.className = "local-mini-cart__items";
    var subtotal = 0;
    cart.forEach(function (item) {
      subtotal += priceAmount(item.price) * item.quantity;
      var row = document.createElement("div");
      row.className = "local-mini-cart__item";
      row.dataset.cartPath = item.path;
      var product = document.createElement("a");
      product.className = "local-mini-cart__product";
      product.href = productLink(item);
      if (item.image) {
        var image = document.createElement("img");
        image.src = item.image;
        image.alt = "";
        image.loading = "lazy";
        product.appendChild(image);
      }
      var details = document.createElement("span");
      details.className = "local-mini-cart__details";
      var title = document.createElement("strong");
      title.textContent = item.title;
      var info = document.createElement("span");
      info.textContent = item.quantity + " × " + item.price;
      details.append(title, info);
      product.appendChild(details);
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "local-mini-cart__remove";
      remove.dataset.cartAction = "remove";
      remove.setAttribute("aria-label", "Remove " + item.title + " from cart");
      remove.textContent = "Remove";
      row.append(product, remove);
      items.appendChild(row);
    });

    var total = document.createElement("p");
    total.className = "local-mini-cart__subtotal";
    total.textContent = "Subtotal: " + formatTotal(subtotal);
    content.append(items, total, whatsAppOrderLink(cart));
  }

  function showCartNotice(message) {
    var notice = document.getElementById("local-cart-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "local-cart-notice";
      notice.className = "local-cart-notice";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      document.body.appendChild(notice);
    }
    notice.textContent = message;
    notice.classList.add("is-visible");
    window.clearTimeout(notice.hideTimer);
    notice.hideTimer = window.setTimeout(function () {
      notice.classList.remove("is-visible");
    }, 2600);
  }

  function addToCart(product, quantity) {
    if (!product || !product.path || !product.title || !product.price) {
      showCartNotice("This product could not be added to the cart.");
      return;
    }
    var amount = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    var cart = readCart();
    var existing = cart.find(function (item) { return item.path === product.path; });
    if (existing) {
      if (!Number.isSafeInteger(existing.quantity + amount)) {
        showCartNotice("The quantity is too large to add.");
        return;
      }
      existing.quantity += amount;
      existing.title = product.title;
      existing.price = product.price;
      existing.image = product.image || existing.image || "";
    } else {
      cart.push({
        path: product.path,
        title: product.title,
        price: product.price,
        image: product.image || "",
        quantity: amount
      });
    }
    if (saveCart(cart)) showCartNotice(product.title + " added to cart.");
  }

  function addCartButton(container, product, className) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.localAdd = product.path;
    button.textContent = "Add to cart";
    button.style.setProperty("transition", "none", "important");
    container.appendChild(button);
    return button;
  }

  function prepareProductCards() {
    document.querySelectorAll(".product-item").forEach(function (card) {
      var link = card.querySelector(".product-item__title, .product-item__image-wrapper");
      var path = productPath(link);
      var product = activeProducts.find(function (item) { return item.path === path; });
      var addButton = Array.from(card.querySelectorAll("button")).find(function (candidate) {
        return candidate.dataset.action === "add-to-cart" ||
          candidate.textContent.trim().toLocaleLowerCase() === "sold out";
      });
      if (product && addButton) {
        addButton.disabled = false;
        addButton.type = "button";
        addButton.classList.remove("button--disabled");
        addButton.classList.add("local-add-to-cart");
        addButton.dataset.localAdd = product.path;
        addButton.textContent = "Add to cart";
        addButton.style.setProperty("transition", "none", "important");
      } else if (product) {
        var info = card.querySelector(".product-item__info-inner") || card.querySelector(".product-item__info");
        if (info && !info.querySelector("[data-local-add]")) {
          addCartButton(info, product, "local-add-to-cart");
        }
      }
      card.querySelectorAll("button").forEach(function (candidate) {
        if (!candidate.hasAttribute("data-local-add")) candidate.remove();
      });
      card.querySelectorAll(
        ".product-item__swatch-list, select, [data-secondary-action='open-quick-view'], " +
        ".product-item__action-list a, .product-item__action-list input[type='radio']"
      ).forEach(function (optionControl) { optionControl.remove(); });
    });
  }

  function wireCartControls() {
    document.addEventListener("click", function (event) {
      var target = event.target instanceof Element ? event.target : null;
      var paginationLink = target && target.closest(".pagination a[href]");
      if (paginationLink) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.assign(new URL(paginationLink.getAttribute("href"), window.location.href).href);
        return;
      }

      var addButton = target && target.closest("[data-local-add]");
      if (addButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var product = activeProducts.find(function (item) {
          return item.path === addButton.dataset.localAdd;
        });
        addToCart(product, 1);
        return;
      }

      var cartButton = target && target.closest("[data-cart-action]");
      if (!cartButton) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var row = cartButton.closest("[data-cart-path]");
      var path = row && row.dataset.cartPath;
      var cart = readCart();
      var item = cart.find(function (entry) { return entry.path === path; });
      if (cartButton.dataset.cartAction === "clear") {
        saveCart([]);
      } else if (item && cartButton.dataset.cartAction === "remove") {
        saveCart(cart.filter(function (entry) { return entry.path !== path; }));
      } else if (item && cartButton.dataset.cartAction === "increase") {
        if (Number.isSafeInteger(item.quantity + 1)) item.quantity += 1;
        else showCartNotice("The quantity is too large to increase.");
        saveCart(cart);
      } else if (item && cartButton.dataset.cartAction === "decrease") {
        if (item.quantity > 1) item.quantity -= 1;
        saveCart(cart);
      }
      if (isSitePage("cart")) renderCart();
    }, true);

    document.addEventListener("change", function (event) {
      var input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input || !input.matches("[data-cart-quantity]")) return;
      event.stopImmediatePropagation();
      var row = input.closest("[data-cart-path]");
      if (!row) return;
      var quantity = Number(input.value);
      if (!input.validity.valid || !Number.isSafeInteger(quantity) || quantity < 1) {
        showCartNotice("Enter a whole-number quantity of at least 1.");
        renderCart();
        return;
      }
      var cart = readCart();
      var item = cart.find(function (entry) { return entry.path === row.dataset.cartPath; });
      if (item) {
        item.quantity = quantity;
        saveCart(cart);
        renderCart();
      }
    });

    document.addEventListener("submit", function (event) {
      var form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.closest(".product-item")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var card = form.closest(".product-item");
      var path = productPath(card.querySelector(".product-item__title, .product-item__image-wrapper"));
      var product = activeProducts.find(function (item) { return item.path === path; });
      addToCart(product, 1);
    }, true);
  }

  function formatTotal(amount) {
    return "$ " + amount.toFixed(2).replace(/\.00$/, "");
  }

  function priceAmount(price) {
    var value = String(price).replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/);
    if (!value) throw new Error("Cart item has an invalid price: " + price);
    return Number(value[0]);
  }

  function renderCart() {
    var main = document.querySelector("main");
    if (!main) return;
    var cart = readCart();
    main.replaceChildren();
    var section = document.createElement("section");
    section.className = "local-cart";
    var heading = document.createElement("h1");
    heading.textContent = "Your cart";
    section.appendChild(heading);
    if (!cart.length) {
      var empty = document.createElement("p");
      empty.className = "local-cart__empty";
      empty.textContent = "Your cart is empty.";
      var shop = document.createElement("a");
      shop.className = "local-cart__button";
      shop.href = siteUrl("");
      shop.textContent = "Continue shopping";
      section.append(empty, shop);
      main.appendChild(section);
      updateCartCount(cart);
      return;
    }

    var items = document.createElement("div");
    items.className = "local-cart__items";
    var subtotal = 0;
    cart.forEach(function (item) {
      var unitPrice = priceAmount(item.price);
      var lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      var row = document.createElement("article");
      row.className = "local-cart__item";
      row.dataset.cartPath = item.path;
      if (item.image) {
        var image = document.createElement("img");
        image.src = item.image;
        image.alt = "";
        image.loading = "lazy";
        row.appendChild(image);
      }
      var details = document.createElement("div");
      details.className = "local-cart__details";
      var name = document.createElement("a");
      name.href = productLink(item);
      name.textContent = item.title;
      var price = document.createElement("p");
      price.textContent = item.price;
      details.append(name, price);
      var controls = document.createElement("div");
      controls.className = "local-cart__controls";
      var decrease = document.createElement("button");
      decrease.type = "button";
      decrease.dataset.cartAction = "decrease";
      decrease.disabled = item.quantity <= 1;
      decrease.setAttribute("aria-label", "Decrease quantity");
      decrease.textContent = "−";
      var quantity = document.createElement("input");
      quantity.type = "number";
      quantity.min = "1";
      quantity.step = "1";
      quantity.max = String(Number.MAX_SAFE_INTEGER);
      quantity.value = String(item.quantity);
      quantity.inputMode = "numeric";
      quantity.setAttribute("aria-label", "Quantity for " + item.title);
      quantity.dataset.cartQuantity = "true";
      var increase = document.createElement("button");
      increase.type = "button";
      increase.dataset.cartAction = "increase";
      increase.setAttribute("aria-label", "Increase quantity");
      increase.textContent = "+";
      controls.append(decrease, quantity, increase);
      var line = document.createElement("strong");
      line.className = "local-cart__line-total";
      line.textContent = formatTotal(lineTotal);
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "local-cart__remove";
      remove.dataset.cartAction = "remove";
      remove.setAttribute("aria-label", "Remove " + item.title + " from cart");
      remove.textContent = "Remove";
      details.append(controls, line, remove);
      row.appendChild(details);
      items.appendChild(row);
    });
    section.appendChild(items);
    var summary = document.createElement("div");
    summary.className = "local-cart__summary";
    var total = document.createElement("strong");
    total.textContent = "Subtotal: " + formatTotal(subtotal);
    var note = document.createElement("p");
    note.textContent = "Shipping and taxes are calculated at checkout.";
    var actions = document.createElement("div");
    actions.className = "local-cart__actions";
    var continueLink = document.createElement("a");
    continueLink.className = "local-cart__button local-cart__button--secondary";
    continueLink.href = siteUrl("");
    continueLink.textContent = "Continue shopping";
    var clear = document.createElement("button");
    clear.type = "button";
    clear.className = "local-cart__remove";
    clear.dataset.cartAction = "clear";
    clear.textContent = "Empty cart";
    actions.append(continueLink, whatsAppOrderLink(cart), clear);
    summary.append(total, note, actions);
    section.appendChild(summary);
    main.appendChild(section);
    updateCartCount(cart);
  }

  function submitSearch(form) {
    var input = form.querySelector("input[name='q']");
    var query = input ? input.value.trim() : "";
    if (!query) {
      if (input) input.focus();
      return;
    }
    window.location.assign(siteUrl("search.html") + "?q=" + encodeURIComponent(query));
  }

  function wireSearchForms() {
    document.addEventListener("mousedown", function (event) {
      var target = event.target instanceof Element ? event.target : null;
      if (target && target.closest(".local-quick-result, .local-quick-result__all")) {
        event.preventDefault();
      }
    }, true);

    document.addEventListener("submit", function (event) {
      var form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.querySelector("input[name='q']")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      submitSearch(form);
    }, true);

    document.addEventListener("click", function (event) {
      var target = event.target instanceof Element ? event.target : null;
      var resultLink = target && target.closest(".local-quick-result, .local-quick-result__all");
      if (!resultLink || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(resultLink.href);
    }, true);

    document.addEventListener("click", function (event) {
      var target = event.target instanceof Element ? event.target : null;
      var button = target && target.closest("button[type='submit'], input[type='submit']");
      var form = button && button.form;
      if (!form || !form.querySelector("input[name='q']")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      submitSearch(form);
    }, true);

    function attachSearchInputs(root) {
      var inputs = [];
      if (root instanceof HTMLInputElement) inputs.push(root);
      if (root.querySelectorAll) {
        inputs = inputs.concat(Array.from(root.querySelectorAll(".search-bar input[name='q']")));
      }
      inputs.forEach(function (input) {
        if (wiredSearchInputs.has(input) || input.name !== "q" ||
            !input.form || !input.form.classList.contains("search-bar")) return;
        wiredSearchInputs.add(input);
        function updateResults() {
          renderQuickResults(activeProducts, input.form, input.value);
        }
        input.addEventListener("input", updateResults);
        input.addEventListener("keyup", updateResults);
        input.addEventListener("change", updateResults);

        var resultsInner = input.form.querySelector(".search-bar__results-inner");
        if (resultsInner && !wiredSearchResultLists.has(resultsInner)) {
          wiredSearchResultLists.add(resultsInner);
          new MutationObserver(function () {
            if (input.value.trim() &&
                !resultsInner.querySelector(".local-quick-result, .local-quick-result__empty, .local-quick-result__all")) {
              renderQuickResults(activeProducts, input.form, input.value);
            }
          }).observe(resultsInner, { childList: true });
        }
      });
    }

    attachSearchInputs(document);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(attachSearchInputs);
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function renderQuickResults(products, form, query) {
    var results = form.querySelector(".search-bar__results");
    var resultsInner = form.querySelector(".search-bar__results-inner");
    if (!results || !resultsInner) return;

    var terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    resultsInner.replaceChildren();
    if (!terms.length) {
      results.setAttribute("aria-hidden", "true");
      return;
    }

    var matches = products.filter(function (product) {
      var text = (product.title + " " + product.path).toLocaleLowerCase();
      return terms.every(function (term) { return text.indexOf(term) !== -1; });
    }).slice(0, 6);

    matches.forEach(function (product) {
      var link = document.createElement("a");
      link.className = "local-quick-result";
      link.href = productLink(product);
      if (product.image) {
        var image = document.createElement("img");
        image.src = product.image;
        image.alt = "";
        image.loading = "lazy";
        link.appendChild(image);
      }
      var info = document.createElement("span");
      info.className = "local-quick-result__info";
      var title = document.createElement("span");
      title.className = "local-quick-result__title";
      title.textContent = product.title;
      var price = document.createElement("span");
      price.className = "local-quick-result__price";
      price.textContent = product.price;
      info.append(title, price);
      link.appendChild(info);
      resultsInner.appendChild(link);
    });

    if (!matches.length) {
      var empty = document.createElement("p");
      empty.className = "local-quick-result__empty";
      empty.textContent = "No matching products found.";
      resultsInner.appendChild(empty);
    }

    var allResults = document.createElement("a");
    allResults.className = "local-quick-result__all";
    allResults.href = siteUrl("search.html") + "?q=" + encodeURIComponent(query.trim());
    allResults.textContent = "View all search results";
    resultsInner.appendChild(allResults);
    results.setAttribute("aria-hidden", "false");
  }

  function prepareProductLinks() {
    document.querySelectorAll(".product-item a[href]").forEach(function (link) {
      var path = productPath(link);
      if (path) link.href = productLink({ path: path });
    });
  }

  function addStyles() {
    if (document.getElementById("local-store-styles")) return;
    if (isSitePage("search")) {
      document.documentElement.classList.add("local-search-page");
    }
    var style = document.createElement("style");
    style.id = "local-store-styles";
    style.textContent = [
      ".local-search-results{padding:28px 20px;max-width:1200px;margin:0 auto}",
      "html.local-search-page .search-bar__inner{display:none!important}",
      "#shopify-section-slideshow{margin-top:16px}",
      ".local-search-results h1{margin:0 0 22px;font-size:30px}",
      ".local-search-pagination{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:8px;margin:28px 0}",
      ".local-search-pagination a,.local-search-pagination span{display:inline-flex;min-width:40px;min-height:40px;align-items:center;justify-content:center;padding:8px 12px;border:1px solid #e1e3e4;color:#1e2d7d;text-decoration:none}",
      ".local-search-pagination a:hover{border-color:#1e2d7d;background:#f3f5f6}",
      ".local-search-pagination [aria-current=page]{border-color:#1e2d7d;background:#1e2d7d;color:#fff}",
      ".local-product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:20px}",
      ".local-product-card{display:flex;flex-direction:column;color:inherit;border:1px solid #e1e3e4;padding:12px;background:#fff}",
      ".local-product-card:hover{box-shadow:0 3px 14px #0002}",
      ".local-product-card__link{display:flex;flex:1;flex-direction:column;color:inherit;text-decoration:none}",
      ".local-product-card img{width:100%;height:190px;object-fit:contain}",
      ".local-product-card__title{display:block;margin:10px 0;font-weight:600}",
      ".local-product-card__price{display:block;color:#db0000;font-weight:700}",
      ".local-add-to-cart{display:block;width:100%;margin-top:10px;padding:11px 14px;border:0;background:#1e2d7d;color:#fff;font:inherit;font-weight:600;cursor:pointer;transition:none!important}",
      ".local-add-to-cart:hover{background:#17235f;color:#fff}",
      "button.local-add-to-cart,button.product-item__action-button.local-add-to-cart{background:#1e2d7d!important;border-color:#1e2d7d!important;color:#fff!important}",
      "button.local-add-to-cart:hover,button.product-item__action-button.local-add-to-cart:hover{background:#17235f!important;border-color:#17235f!important;color:#fff!important}",
      ".local-quick-result{box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:10px;border-bottom:1px solid #e1e3e4;color:inherit;text-decoration:none}",
      ".local-quick-result:hover{background:#f3f5f6}",
      ".local-quick-result img{width:52px;height:52px;object-fit:contain;flex:none}",
      ".local-quick-result__info{display:flex;flex:1;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}",
      ".local-quick-result__title{max-width:100%;font-weight:600;overflow-wrap:anywhere}",
      ".local-quick-result__price{color:#db0000;font-weight:700;white-space:nowrap}",
      ".local-quick-result__all{display:block;padding:12px;text-align:center;color:#db0000;font-weight:600}",
      ".local-quick-result__empty{padding:12px}",
      ".local-search-empty{padding:24px 0}",
      ".local-product-detail{max-width:1100px;margin:40px auto;padding:24px;display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,1fr);gap:40px}",
      ".local-product-detail img{display:block;width:100%;max-height:600px;object-fit:contain}",
      ".local-product-detail__price{font-size:24px;font-weight:700;color:#db0000}",
      ".local-product-detail__description{line-height:1.7}",
      ".local-product-detail__back{display:inline-block;margin:24px}",
      ".local-cart{max-width:900px;margin:36px auto;padding:20px}",
      ".local-cart h1{margin:0 0 24px}",
      ".local-cart__items{border-top:1px solid #e1e3e4}",
      ".local-cart__item{display:flex;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid #e1e3e4}",
      ".local-cart__item>img{width:90px;height:90px;object-fit:contain;flex:none}",
      ".local-cart__details{display:grid;flex:1;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px 20px}",
      ".local-cart__details>a{color:#1e2d7d;font-weight:600}",
      ".local-cart__details p{margin:4px 0 0}",
      ".local-cart__controls{display:flex;align-items:center;gap:8px}",
      ".local-cart__controls button,.local-cart__controls input{box-sizing:border-box;width:38px;height:36px;text-align:center}",
      ".local-cart__controls button{border:1px solid #d4d6d8;background:#fff;cursor:pointer;font-size:20px}",
      ".local-cart__controls button:disabled{opacity:.45;cursor:not-allowed}",
      ".local-cart__controls input{border:1px solid #d4d6d8}",
      ".local-cart__line-total{justify-self:end}",
      ".local-cart__remove{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:7px 12px;border:1px solid #b00000;border-radius:3px;background:#fff;color:#b00000;text-decoration:none;cursor:pointer;font:inherit;font-weight:600;justify-self:start}",
      ".local-cart__remove:hover{background:#b00000;color:#fff}",
      ".local-cart__summary{margin:24px 0 0 auto;max-width:380px;text-align:right}",
      ".local-cart__summary>strong{font-size:20px}",
      ".local-cart__summary p{color:#677279}",
      ".local-cart__actions{display:flex;justify-content:flex-end;align-items:center;gap:16px;margin-top:18px}",
      ".local-cart__button{display:inline-block;padding:12px 18px;background:#1e2d7d;color:#fff;text-decoration:none;font-weight:600}",
      ".local-cart__button--secondary{background:#f3f5f6;color:#1e2d7d}",
      ".local-cart__empty{margin:0 0 20px}",
      ".local-mini-cart__empty{margin:16px;text-align:center}",
      ".local-mini-cart__items{max-height:300px;overflow:auto}",
      ".local-mini-cart__item{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #e1e3e4}",
      ".local-mini-cart__product{display:flex;flex:1;min-width:0;align-items:center;gap:12px;color:inherit;text-decoration:none}",
      ".local-mini-cart__product img{width:54px;height:54px;object-fit:contain;flex:none}",
      ".local-mini-cart__details{display:flex;min-width:0;flex-direction:column;gap:4px}",
      ".local-mini-cart__details strong{font-weight:600}",
      ".local-mini-cart__remove{flex:none;padding:6px 8px;border:1px solid #b00000;border-radius:3px;background:#fff;color:#b00000;cursor:pointer;font:inherit;font-size:12px;font-weight:600}",
      ".local-mini-cart__remove:hover{background:#b00000;color:#fff}",
      ".local-mini-cart__subtotal{margin:14px 16px;font-weight:700;text-align:right}",
      ".local-whatsapp-link{box-sizing:border-box;text-align:center;text-decoration:none}",
      ".local-whatsapp-float{position:fixed;z-index:100000;right:20px;bottom:20px;display:flex;width:58px;height:58px;align-items:center;justify-content:center;border-radius:50%;background:#25d366;color:#fff;box-shadow:0 3px 12px #0004;text-decoration:none;transition:transform .2s,background-color .2s}",
      ".local-whatsapp-float:hover{transform:scale(1.07);background:#1fbd5b}",
      ".local-whatsapp-float:focus-visible{outline:3px solid #1e2d7d;outline-offset:3px}",
      ".local-whatsapp-float svg{width:34px;height:34px}",
      ".local-cart-notice{position:fixed;z-index:99999;right:18px;bottom:18px;max-width:min(420px,calc(100vw - 36px));padding:14px 18px;background:#1e2d7d;color:#fff;box-shadow:0 4px 16px #0003;opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity .2s,transform .2s}",
      ".local-cart-notice.is-visible{opacity:1;transform:translateY(0)}",
      "@media(max-width:640px){.local-product-detail{grid-template-columns:1fr;margin:16px auto;padding:16px}.local-product-card img{height:150px}.local-cart{padding:14px}.local-cart__item{align-items:flex-start;gap:10px}.local-cart__item>img{width:64px;height:64px}.local-cart__details{grid-template-columns:minmax(0,1fr);gap:8px}.local-cart__line-total{justify-self:start}.local-cart__actions{flex-wrap:wrap;justify-content:flex-start}.local-mini-cart__item{padding:10px}.local-mini-cart__product{gap:8px}.local-mini-cart__product img{width:44px;height:44px}}"
    ].join("");
    style.textContent += "@media(max-width:640px){.local-cart{margin:16px auto;padding:16px}.local-cart__item{align-items:flex-start;gap:12px}.local-cart__item>img{width:64px;height:64px}.local-cart__details{grid-template-columns:1fr;gap:10px}.local-cart__line-total{justify-self:start}.local-cart__summary{max-width:none}.local-cart__actions{flex-wrap:wrap}}";
    style.textContent += "@media(max-width:640px){.local-whatsapp-float{right:16px;bottom:calc(16px + env(safe-area-inset-bottom));width:54px;height:54px}.local-whatsapp-float svg{width:31px;height:31px}}";
    document.head.appendChild(style);
  }

  function renderSearch(products) {
    var query = new URLSearchParams(window.location.search).get("q") || "";
    var normalizedQuery = query.trim().toLocaleLowerCase();
    var searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
    document.querySelectorAll(".search-bar input[name='q']").forEach(function (input) {
      input.value = query;
    });
    var matches = normalizedQuery ? products.filter(function (product) {
      var searchableText = (product.title + " " + product.path).toLocaleLowerCase();
      return searchTerms.every(function (term) {
        return searchableText.indexOf(term) !== -1;
      });
    }) : [];
    matches.sort(function (first, second) {
      var firstTitle = first.title.toLocaleLowerCase();
      var secondTitle = second.title.toLocaleLowerCase();
      var firstStarts = firstTitle.indexOf(normalizedQuery) === 0 ? 0 : 1;
      var secondStarts = secondTitle.indexOf(normalizedQuery) === 0 ? 0 : 1;
      return firstStarts - secondStarts || firstTitle.localeCompare(secondTitle);
    });
    var pageSize = 24;
    var totalPages = Math.ceil(matches.length / pageSize);
    var requestedPage = Number(new URLSearchParams(window.location.search).get("page"));
    var currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    currentPage = Math.min(currentPage, Math.max(totalPages, 1));
    var pageMatches = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    var main = document.querySelector("main");
    if (!main) return;

    main.replaceChildren();
    var section = document.createElement("section");
    section.className = "local-search-results";
    var heading = document.createElement("h1");
    heading.textContent = normalizedQuery ? "Search results for: " + query.trim() : "Search products";
    section.appendChild(heading);

    if (!normalizedQuery) {
      var prompt = document.createElement("p");
      prompt.className = "local-search-empty";
      prompt.textContent = "Enter a product name in the search box above.";
      section.appendChild(prompt);
    } else if (!matches.length) {
      var empty = document.createElement("p");
      empty.className = "local-search-empty";
      empty.textContent = "No products found. Try another search.";
      section.appendChild(empty);
    } else {
      var grid = document.createElement("div");
      grid.className = "local-product-grid";
      pageMatches.forEach(function (product) {
        var card = document.createElement("article");
        card.className = "local-product-card";
        var link = document.createElement("a");
        link.className = "local-product-card__link";
        link.href = productLink(product);
        if (product.image) {
          var image = document.createElement("img");
          image.src = product.image;
          image.alt = product.title;
          image.loading = "lazy";
          link.appendChild(image);
        }
        var title = document.createElement("span");
        title.className = "local-product-card__title";
        title.textContent = product.title;
        var price = document.createElement("span");
        price.className = "local-product-card__price";
        price.textContent = product.price;
        link.append(title, price);
        card.appendChild(link);
        addCartButton(card, product, "local-add-to-cart");
        grid.appendChild(card);
      });
      section.appendChild(grid);

      if (totalPages > 1) {
        var pagination = document.createElement("nav");
        pagination.className = "local-search-pagination";
        pagination.setAttribute("aria-label", "Search result pages");

        if (currentPage > 1) {
          var previous = document.createElement("a");
          previous.href = siteUrl("search.html?q=" + encodeURIComponent(query) + "&page=" + (currentPage - 1));
          previous.textContent = "Previous";
          pagination.appendChild(previous);
        }

        for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
          if (pageNumber === currentPage) {
            var activePage = document.createElement("span");
            activePage.setAttribute("aria-current", "page");
            activePage.textContent = String(pageNumber);
            pagination.appendChild(activePage);
          } else {
            var pageLink = document.createElement("a");
            pageLink.href = siteUrl("search.html?q=" + encodeURIComponent(query) + "&page=" + pageNumber);
            pageLink.textContent = String(pageNumber);
            pageLink.setAttribute("aria-label", "Page " + pageNumber);
            pagination.appendChild(pageLink);
          }
        }

        if (currentPage < totalPages) {
          var next = document.createElement("a");
          next.href = siteUrl("search.html?q=" + encodeURIComponent(query) + "&page=" + (currentPage + 1));
          next.textContent = "Next";
          pagination.appendChild(next);
        }
        section.appendChild(pagination);
      }
    }
    main.appendChild(section);
    document.title = normalizedQuery ? "Search: " + query.trim() + " | DK Game Center" : "Search | DK Game Center";
  }

  async function renderProduct(products) {
    var path = new URLSearchParams(window.location.search).get("url") || "";
    if (path.charAt(0) !== "/" || path.indexOf("/products/") !== 0) {
      throw new Error("Product page URL is missing or invalid.");
    }
    var product = products.find(function (item) { return item.path === path; });
    if (!product && document.referrer) {
      var referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin) {
        var sourceResponse = await fetch(referrer.href, { credentials: "same-origin" });
        if (sourceResponse.ok) {
          var sourcePage = new DOMParser().parseFromString(await sourceResponse.text(), "text/html");
          product = readProducts(sourcePage).find(function (item) { return item.path === path; });
        }
      }
    }

    try {
      var response = await fetch(siteUrl(path), { credentials: "same-origin" });
      if (response.ok) {
        var productPage = new DOMParser().parseFromString(await response.text(), "text/html");
        var description = productPage.querySelector(".product-block-list__item--description .rte");
        var actualTitle = productPage.querySelector(".product-meta__title");
        var price = productPage.querySelector(".product-form__info-content .price");
        var image = productPage.querySelector("meta[property='og:image']");
        if (!product) {
          product = {
            path: path,
            title: actualTitle ? actualTitle.textContent.trim() : "",
            price: price ? price.textContent.replace(/\s+/g, " ").trim() : "",
            image: image ? image.content : "",
            description: ""
          };
        }
        if (description) product.description = description.textContent.replace(/\s+/g, " ").trim();
        if (actualTitle) product.title = actualTitle.textContent.trim();
        if (price) {
          var priceCopy = price.cloneNode(true);
          priceCopy.querySelectorAll(".visually-hidden").forEach(function (node) {
            node.remove();
          });
          product.price = priceCopy.textContent.replace(/\s+/g, " ").trim();
        }
        if (!product.image && image) product.image = image.content;
      }
    } catch (error) {
      console.warn("Could not load extended product details; showing catalog information.", error);
    }
    if (!product) throw new Error("Product was not found in the catalog or the referring collection.");
    if (!product.title || !product.price) {
      throw new Error("Product title or price is missing from the available product data.");
    }

    var main = document.querySelector("main") || document.body;
    main.replaceChildren();
    var back = document.createElement("a");
    back.className = "local-product-detail__back";
    back.href = siteUrl("");
    back.textContent = "Back to shopping";
    main.appendChild(back);

    var detail = document.createElement("article");
    detail.className = "local-product-detail";
    if (product.image) {
      var image = document.createElement("img");
      image.src = product.image;
      image.alt = product.title;
      detail.appendChild(image);
    }
    var info = document.createElement("div");
    var title = document.createElement("h1");
    title.textContent = product.title;
    var price = document.createElement("p");
    price.className = "local-product-detail__price";
    price.textContent = product.price;
    info.append(title, price);
    if (product.description) {
      var description = document.createElement("p");
      description.className = "local-product-detail__description";
      description.textContent = product.description;
      info.appendChild(description);
    }
    addCartButton(info, product, "local-add-to-cart");
    detail.appendChild(info);
    main.appendChild(detail);
    document.title = product.title + " | DK Game Center";
  }

  async function initialize() {
    addStyles();
    wireSearchForms();
    wireCartControls();
    addFloatingWhatsAppButton();
    clearCartOnReload();
    try {
      var products = await loadProducts();
      activeProducts = products;
      prepareProductLinks();
      prepareProductCards();
      updateCartCount(readCart());
      document.querySelectorAll(".search-bar input[name='q']").forEach(function (input) {
        if (input.value.trim()) renderQuickResults(activeProducts, input.form, input.value);
      });
      if (isSitePage("cart")) {
        renderCart();
      } else if (isSitePage("search")) {
        renderSearch(products);
      } else if (window.location.pathname === sitePath("product.html") ||
        (window.location.pathname === sitePath("index.html") &&
          new URLSearchParams(window.location.search).has("url"))) {
        await renderProduct(products);
      }
    } catch (error) {
      console.error("The product catalog could not be loaded.", error);
      var main = document.querySelector("main") || document.body;
      var message = document.createElement("p");
      message.className = "local-search-empty";
      message.textContent = "Products could not be loaded. Please refresh and try again.";
      main.appendChild(message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
