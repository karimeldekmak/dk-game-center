(function () {
  "use strict";

  var storageKey = "gamers-stop-demo-cart";
  var cart = readCart();
  var productIndexRequest;
  var productImagesRequest;

  function loadProductIndex() {
    if (!productIndexRequest) {
      productIndexRequest = fetch("/search-index.json").then(function (response) {
        if (!response.ok) {
          throw new Error("Product index request failed with status " + response.status);
        }

        return response.json();
      }).then(function (products) {
        if (!Array.isArray(products)) {
          throw new Error("Product index has an invalid format.");
        }

        return products;
      });
    }

    return productIndexRequest;
  }

  function loadProductImages() {
    if (!productImagesRequest) {
      productImagesRequest = fetch("/product-images.json").then(function (response) {
        if (!response.ok) {
          throw new Error("Product image request failed with status " + response.status);
        }

        return response.json();
      }).then(function (images) {
        if (!images || typeof images !== "object" || Array.isArray(images)) {
          throw new Error("Product image catalog has an invalid format.");
        }

        return images;
      });
    }

    return productImagesRequest;
  }

  function normalize(value) {
    return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function findProducts(products, query) {
    var tokens = normalize(query).split(/\s+/).filter(Boolean);

    return products.filter(function (product) {
      var words = normalize(product.title || "").split(/[^a-z0-9]+/);
      return tokens.every(function (token) {
        return words.some(function (word) {
          return word.startsWith(token);
        });
      });
    }).sort(function (first, second) {
      var queryText = normalize(query);
      var firstTitle = normalize(first.title);
      var secondTitle = normalize(second.title);
      var firstRank = firstTitle.startsWith(queryText) ? 0 : 1;
      var secondRank = secondTitle.startsWith(queryText) ? 0 : 1;
      return firstRank - secondRank || firstTitle.localeCompare(secondTitle);
    });
  }

  function readCart() {
    try {
      var stored = window.localStorage.getItem(storageKey);
      var value = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(value)) {
        throw new Error("The saved cart is not a list.");
      }

      return value.filter(function (item) {
        return item && typeof item.id === "string" && typeof item.title === "string" &&
          typeof item.url === "string" && (item.price === null ||
          Number.isFinite(item.price) && item.price >= 0) &&
          Number.isInteger(item.quantity) && item.quantity > 0;
      });
    } catch (error) {
      console.error("Unable to read the saved cart.", error);
      return [];
    }
  }

  function announce(message, isError) {
    var status = document.getElementById("local-store-status");

    if (!status) {
      status = document.createElement("div");
      status.id = "local-store-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:10000;padding:12px 16px;background:#1e2d7d;color:#fff;border-radius:4px;max-width:calc(100% - 32px)";
      document.body.appendChild(status);
    }

    status.textContent = message;
    status.style.backgroundColor = isError ? "#b00000" : "#1e2d7d";
    status.hidden = false;
    window.clearTimeout(status.hideTimer);
    status.hideTimer = window.setTimeout(function () {
      status.hidden = true;
    }, 4500);
  }

  function useSiteLogoAsFavicon() {
    var icon = document.head.querySelector('link[rel~="icon"]') || document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/png";
    icon.href = "/dk-game-center-logo.png";

    document.head.querySelectorAll('link[rel~="icon"]').forEach(function (otherIcon) {
      if (otherIcon !== icon) {
        otherIcon.remove();
      }
    });

    if (!icon.isConnected) {
      document.head.appendChild(icon);
    }
  }

  function useSiteLogoInHeader() {
    document.querySelectorAll(".header__logo-image").forEach(function (image) {
      image.src = "/dk-long-logo.png";
      image.alt = "DK Game Center";
      image.removeAttribute("srcset");
      image.removeAttribute("width");
      image.removeAttribute("height");
      image.style.width = "130px";
      image.style.maxWidth = "100%";
      image.style.height = "auto";
      image.style.maxHeight = "52px";
      image.style.objectFit = "contain";
    });
  }

  function removeNewsletterSignup() {
    document.querySelectorAll(".footer__block-item--newsletter").forEach(function (block) {
      block.remove();
    });
  }

  function updateSocialLinks() {
    var profiles = [
      {
        selector: ".social-media__item--instagram a",
        href: "https://instagram.com/dkgame_center?dlrf=MWJhcjdjaGRhcXVmcg%3D%3D",
        label: "Instagram"
      },
      {
        selector: ".social-media__item--tiktok a",
        href: "https://www.tiktok.com/@veltrixo0o?_r=1&_t=ZS-9AY8Oka8gbt",
        label: "TikTok"
      }
    ];

    profiles.forEach(function (profile) {
      document.querySelectorAll(profile.selector).forEach(function (link) {
        link.href = profile.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", "Follow DK Game Center on " + profile.label);

        if (!link.textContent.trim()) {
          var label = document.createElement("span");
          label.className = "social-media__label";
          label.textContent = profile.label;
          link.appendChild(label);
        }
      });
    });
  }

  function addWhatsAppContactButton() {
    if (document.getElementById("whatsapp-contact-button")) {
      return;
    }

    var button = document.createElement("a");
    button.id = "whatsapp-contact-button";
    button.href = "https://wa.me/96176054074?text=Hi%20DK%20Game%20Center%2C%20I%20have%20a%20question%20about%20a%20product.";
    button.target = "_blank";
    button.rel = "noopener noreferrer";
    button.setAttribute("aria-label", "Chat with DK Game Center on WhatsApp");
    button.title = "Chat with us on WhatsApp";
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.496.099-.198.05-.372-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.793.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.073c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.693.625.711.226 1.358.194 1.87.118.57-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.405h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.74.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.438-9.886 9.893-9.886 2.64 0 5.122 1.03 6.985 2.894a9.825 9.825 0 0 1 2.893 6.99c-.003 5.45-4.44 9.886-9.888 9.886m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.334.157 11.89c0 2.096.547 4.142 1.588 5.946L.05 24l6.335-1.662a11.88 11.88 0 0 0 5.66 1.441h.005c6.554 0 11.89-5.334 11.893-11.89a11.81 11.81 0 0 0-3.48-8.399z"/></svg><span>Chat with us</span>';
    document.body.appendChild(button);
  }

  function saveCart() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (error) {
      console.error("Unable to save the cart.", error);
      announce("Your browser could not save the cart. Check its storage settings.", true);
      return false;
    }

    renderCart();
    return true;
  }

  function formatPrice(amount) {
    return "$ " + amount.toFixed(2);
  }

  function formatCatalogPrice(amount) {
    return "$ " + amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function cartTotal() {
    return cart.reduce(function (sum, item) {
      return sum + (Number.isFinite(item.price) ? item.price * item.quantity : 0);
    }, 0);
  }

  function cartHasUnpricedItems() {
    return cart.some(function (item) {
      return !Number.isFinite(item.price);
    });
  }

  function canonicalProductUrl(url) {
    try {
      var parsedUrl = new URL(url, window.location.origin);

      if (parsedUrl.pathname === "/product.html") {
        var productUrl = parsedUrl.searchParams.get("url");
        return productUrl && productUrl.startsWith("/products/") ? productUrl : url;
      }

      return parsedUrl.pathname.startsWith("/products/") ? parsedUrl.pathname : url;
    } catch (error) {
      console.error("Unable to read the cart product link.", error);
      return url;
    }
  }

  function whatsappOrderUrl() {
    var lines = [
      "Hi DK Game Center, I would like to order:",
      ""
    ];

    cart.forEach(function (item) {
      lines.push("- " + item.title);
      lines.push("  Quantity: " + item.quantity + " | Unit price: " +
        (Number.isFinite(item.price) ? formatPrice(item.price) : "Please confirm") +
        " | Subtotal: " +
        (Number.isFinite(item.price) ? formatPrice(item.price * item.quantity) : "Please confirm"));
    });
    lines.push("");
    lines.push("Total: " + formatPrice(cartTotal()) +
      (cartHasUnpricedItems() ? " + please confirm prices for unpriced items" : ""));
    lines.push("");
    lines.push("Please confirm availability and delivery details.");

    return "https://wa.me/96176054074?text=" + encodeURIComponent(lines.join("\n"));
  }

  function createWhatsAppOrderLink(className, label) {
    var link = createElement("a", className, label);
    link.href = whatsappOrderUrl();
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined) {
      element.textContent = text;
    }

    return element;
  }

  function createSearchAddForm(product) {
    var form = document.createElement("form");
    form.method = "post";
    form.action = "/cart/add";
    form.className = "product-item__action-list button-stack local-search-add-form";

    var productId = document.createElement("input");
    productId.type = "hidden";
    productId.name = "id";
    productId.value = product.url;
    form.appendChild(productId);

    var quantity = document.createElement("input");
    quantity.type = "hidden";
    quantity.name = "quantity";
    quantity.value = "1";
    form.appendChild(quantity);

    var button = createElement("button", "button button--small button--primary local-search-add", "Add to cart");
    button.type = "submit";
    button.dataset.action = "add-to-cart";
    button.dataset.localAddCart = "true";
    button.dataset.productUrl = product.url;
    button.dataset.productTitle = product.title;
    button.dataset.productPrice = Number.isFinite(product.price) ? String(product.price) : "";
    form.appendChild(button);
    return form;
  }

  function enableLocalCollectionAddButtons() {
    var cards = Array.from(document.querySelectorAll(".product-item")).filter(function (card) {
      return !card.querySelector('button[data-action="add-to-cart"]');
    });

    if (!cards.length) {
      return;
    }

    loadProductIndex().then(function (products) {
      cards.forEach(function (card) {
        if (!card.isConnected || card.querySelector('button[data-action="add-to-cart"]')) {
          return;
        }

        var titleLink = card.querySelector(".product-item__title");
        var productUrl = titleLink && canonicalProductUrl(titleLink.getAttribute("href"));
        var title = titleLink && titleLink.textContent.trim();

        if (!productUrl || !productUrl.startsWith("/products/") || !title) {
          return;
        }

        var indexedProduct = products.find(function (product) {
          return product.url === productUrl;
        });
        var priceElement = card.querySelector(".product-item__price-list .price--highlight") ||
          card.querySelector(".product-item__price-list .price:not(.price--compare)");
        var priceMatch = priceElement && priceElement.textContent.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
        var price = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) :
          indexedProduct && Number.isFinite(indexedProduct.price) ? indexedProduct.price : null;
        var form = createSearchAddForm({
          url: productUrl,
          title: title,
          price: price
        });
        var info = card.querySelector(".product-item__info");
        (info || card).appendChild(form);
      });
    }).catch(function (error) {
      console.error("Unable to prepare add-to-cart buttons for product cards.", error);
    });
  }

  function createCartItem(item, allowQuantity) {
    var row = createElement("div", "local-cart-item");
    var link = createElement("a", "local-cart-item__title", item.title);
    link.href = item.url;
    row.appendChild(link);

    var controls = createElement("div", "local-cart-item__controls");

    if (allowQuantity) {
      var quantity = document.createElement("input");
      quantity.type = "number";
      quantity.min = "1";
      quantity.max = "99";
      quantity.value = String(item.quantity);
      quantity.setAttribute("aria-label", "Quantity for " + item.title);
      quantity.dataset.cartQuantity = item.id;
      controls.appendChild(quantity);
    } else {
      controls.appendChild(createElement("span", "", "Qty: " + item.quantity));
    }

    controls.appendChild(createElement(
      "span",
      "local-cart-item__price",
      Number.isFinite(item.price) ? formatPrice(item.price * item.quantity) : "Price to confirm"
    ));

    var remove = createElement("button", "local-cart-remove", "Remove");
    remove.type = "button";
    remove.dataset.cartRemove = item.id;
    controls.appendChild(remove);
    row.appendChild(controls);
    return row;
  }

  function cartContents(className, allowQuantity) {
    var wrapper = createElement("div", className);

    if (cart.length === 0) {
      wrapper.appendChild(createElement("p", "", "Your cart is empty."));
      var shopLink = createElement("a", "button button--primary", "Shop products");
      shopLink.href = "/collections/all";
      wrapper.appendChild(shopLink);
      return wrapper;
    }

    var items = createElement("div", "local-cart-items");
    cart.forEach(function (item) {
      items.appendChild(createCartItem(item, allowQuantity));
    });
    wrapper.appendChild(items);

    var totalText = cartHasUnpricedItems() && cartTotal() === 0
      ? "Order total: Price to confirm"
      : "Order total: " + formatPrice(cartTotal());
    if (cartHasUnpricedItems() && cartTotal() > 0) {
      totalText += " (plus items with price to confirm)";
    }
    var total = createElement("p", "local-cart-total", totalText);
    wrapper.appendChild(total);

    var note = createElement("p", "local-cart-note", "WhatsApp will open with your order message ready. Review it and send it to complete your order.");
    wrapper.appendChild(note);
    wrapper.appendChild(createWhatsAppOrderLink("button button--primary local-cart-whatsapp", "Send order on WhatsApp"));

    return wrapper;
  }

  function renderCart() {
    var count = cart.reduce(function (sum, item) {
      return sum + item.quantity;
    }, 0);

    document.querySelectorAll(".header__cart-count").forEach(function (badge) {
      badge.textContent = String(count);
    });

    document.querySelectorAll("#mini-cart .mini-cart__content").forEach(function (content) {
      content.className = "mini-cart__content";
      content.replaceChildren(cartContents("local-mini-cart", false));
    });

    if (window.location.pathname.replace(/\/+$/, "") === "/cart") {
      var emptyState = document.querySelector("#main .empty-state, #main .local-cart-page");

      if (emptyState) {
        emptyState.className = "local-cart-page";
        emptyState.replaceChildren(createElement("h1", "heading h1", "Your cart"));
        emptyState.appendChild(cartContents("local-cart-page__content", true));
      }
    }
  }

  function addCartItem(product, quantity) {
    var productUrl = canonicalProductUrl(product.url);

    if (!product.title || !productUrl.startsWith("/products/") ||
      product.price !== null && (!Number.isFinite(product.price) || product.price < 0) ||
      !Number.isInteger(quantity) || quantity < 1) {
      announce("This product could not be added to your cart.", true);
      return false;
    }

    var existing = cart.find(function (item) {
      return item.id === productUrl || canonicalProductUrl(item.url) === productUrl;
    });

    if (existing) {
      existing.id = productUrl;
      existing.title = product.title;
      existing.url = productPageUrl({ url: productUrl }, currentPageUrl(), product.price);
      existing.price = product.price;
      existing.quantity = Math.min(existing.quantity + quantity, 99);
    } else {
      cart.push({
        id: productUrl,
        title: product.title,
        url: productPageUrl({ url: productUrl }, currentPageUrl(), product.price),
        price: product.price,
        quantity: Math.min(quantity, 99)
      });
    }

    if (saveCart()) {
      announce(product.title + (Number.isFinite(product.price)
        ? " added to your cart."
        : " added to your cart. Confirm its price on WhatsApp."));
      return true;
    }

    return false;
  }

  function addProduct(form) {
    var productCard = form.closest(".product-item");
    var titleLink = productCard && productCard.querySelector(".product-item__title");
    var titleElement = titleLink || document.querySelector(".product__info h1, .product__info .product-meta__title, main h1");
    var quantityField = form.querySelector('[name="quantity"]');
    var quantity = quantityField ? Number.parseInt(quantityField.value, 10) : 1;
    var title = titleElement ? titleElement.textContent.trim() : "";
    var url = canonicalProductUrl(titleLink ? titleLink.getAttribute("href") : window.location.pathname);
    var priceElement = productCard
      ? productCard.querySelector(".product-item__price-list .price--highlight") ||
        productCard.querySelector(".product-item__price-list .price:not(.price--compare)")
      : form.querySelector(".product-form__info-content .price");
    var priceMatch = priceElement && priceElement.textContent.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
    var price = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null;

    if (!Number.isInteger(quantity) || quantity < 1 || !url.startsWith("/products/")) {
      announce("This product could not be added to your cart. Open its product page and try again.", true);
      return;
    }

    if (title && price !== null) {
      addCartItem({ id: url, title: title, url: url, price: price }, quantity);
      return;
    }

    loadProductIndex().then(function (products) {
      var product = products.find(function (entry) {
        return entry.url === url;
      });

      if (!title && product) {
        title = product.title;
      }
      if (price === null && product && Number.isFinite(product.price)) {
        price = product.price;
      }
      addCartItem({
        id: url,
        title: title || (product && product.title) || "",
        url: url,
        price: price
      }, quantity);
    }).catch(function (error) {
      console.error("Unable to look up the product while adding it to the cart.", error);
      if (title) {
        addCartItem({ id: url, title: title, url: url, price: price }, quantity);
      } else {
        announce("This product could not be added because its details could not be loaded.", true);
      }
    });
  }

  function addProductFromButton(button) {
    var priceValue = button.dataset.productPrice;
    var price = priceValue === undefined || priceValue === "" ? null : Number(priceValue);
    var form = button.closest("form");
    var quantityField = form && form.querySelector('[name="quantity"]');
    var quantity = quantityField ? Number.parseInt(quantityField.value, 10) : 1;

    addCartItem({
      id: button.dataset.productUrl || "",
      title: button.dataset.productTitle || "",
      url: button.dataset.productUrl || "",
      price: price
    }, quantity);
  }

  function addStyles() {
    var style = document.createElement("style");
    style.textContent = [
      ".local-cart-items{display:grid;gap:12px;margin:20px 0}",
      ".local-cart-item{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid #e1e3e4}",
      ".local-cart-item__title{color:inherit;font-weight:600}",
      ".local-cart-item__controls{display:flex;align-items:center;gap:12px}",
      ".local-cart-item__controls input{width:64px;padding:8px}",
      ".local-cart-item__price,.local-cart-total{font-weight:600}",
      ".local-cart-remove{border:0;background:none;color:#b00000;text-decoration:underline;cursor:pointer}",
      ".local-product-detail__price{margin:12px 0;color:#b00000;font-size:1.5rem;font-weight:700}",
      ".local-product-detail__add{margin:8px 0 16px}",
      "button[data-action=\"add-to-cart\"],.local-product-detail__add{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:46px;padding:0 22px;border:0!important;border-radius:12px!important;background:linear-gradient(135deg,#f04438 0%,#c90019 55%,#a90014 100%)!important;color:#fff!important;font:700 15px/1 Barlow,Arial,sans-serif!important;letter-spacing:.02em;box-shadow:0 5px 14px rgba(201,0,25,.24),inset 0 1px 0 rgba(255,255,255,.22);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}",
      "button[data-action=\"add-to-cart\"]::before,.local-product-detail__add::before{content:\"+\";display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:1px solid rgba(255,255,255,.7);border-radius:50%;font:500 19px/1 Arial,sans-serif}",
      "button[data-action=\"add-to-cart\"]:hover,.local-product-detail__add:hover{transform:translateY(-2px);filter:brightness(1.08);box-shadow:0 9px 20px rgba(201,0,25,.32),inset 0 1px 0 rgba(255,255,255,.24)}",
      "button[data-action=\"add-to-cart\"]:active,.local-product-detail__add:active{transform:translateY(0) scale(.98);box-shadow:0 3px 8px rgba(201,0,25,.24)}",
      "button[data-action=\"add-to-cart\"]:focus-visible,.local-product-detail__add:focus-visible{outline:3px solid #171717!important;outline-offset:3px}",
      "button[data-action=\"add-to-cart\"]:disabled,.local-product-detail__add:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}",
      ".local-search-add{width:100%;min-height:42px;margin-top:8px}",
      "#whatsapp-contact-button{position:fixed;right:24px;bottom:24px;z-index:10001;display:flex;align-items:center;gap:10px;min-height:56px;box-sizing:border-box;padding:10px 18px;border-radius:999px;background:#25d366;color:#fff;font:600 15px/1.2 Barlow,Arial,sans-serif;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.24);transition:background-color .2s ease,transform .2s ease,box-shadow .2s ease}",
      "#whatsapp-contact-button:hover{background:#1ebe5d;color:#fff;transform:translateY(-2px);box-shadow:0 7px 18px rgba(0,0,0,.28)}",
      "#whatsapp-contact-button:focus-visible{outline:3px solid #111;outline-offset:3px}",
      "#whatsapp-contact-button svg{display:block;width:28px;height:28px;flex:none}",
      "@media(max-width:480px){#whatsapp-contact-button{right:16px;right:max(16px,env(safe-area-inset-right));bottom:16px;bottom:calc(16px + env(safe-area-inset-bottom));width:52px;height:52px;min-height:52px;justify-content:center;padding:0}#whatsapp-contact-button span{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}}",
      "@media(prefers-reduced-motion:reduce){#whatsapp-contact-button{transition:none}}",
      ".footer__aside-item--social .social-media__item-list{display:flex;flex-wrap:wrap;gap:12px 20px}",
      ".footer__aside-item--social .social-media__item--instagram a,.footer__aside-item--social .social-media__item--tiktok a{display:inline-flex;align-items:center;gap:8px;min-height:44px}",
      ".footer__aside-item--social .social-media__label{font-size:14px;font-weight:600}",
      ".local-cart-total{margin:18px 0}",
      ".local-cart-note{margin:12px 0;color:#677279}",
      ".local-cart-whatsapp{display:inline-flex;align-items:center;justify-content:center;margin:8px 0 16px;text-align:center}",
      ".local-cart-page{max-width:900px;margin:48px auto;padding:24px}",
      ".local-mini-cart{padding:16px}",
      ".local-mini-cart .local-cart-items{gap:6px}",
      ".local-mini-cart .local-cart-item{display:block;padding:8px 0}",
      ".local-mini-cart .local-cart-item__controls{justify-content:space-between;margin-top:6px}",
      ".header__action-item--account,.product-form__payment-container,.shopify-payment-button,shopify-accelerated-checkout{display:none!important}",
      ".expandable-content .rte{overflow:hidden;transition:max-height .25s ease}",
      ".expandable-content[aria-expanded=\"false\"] .rte{max-height:360px}",
      ".expandable-content[aria-expanded=\"true\"] .rte{max-height:none}",
      ".search-bar__results .skeleton-container{display:none}",
      ".search-bar__results[aria-hidden=\"false\"],.search-bar__results[aria-hidden=\"false\"] .search-bar__results-inner{visibility:visible!important}",
      ".local-search-result{padding:10px 16px;border-bottom:1px solid #e1e3e4}",
      ".local-search-suggestion{display:block;padding:4px 0;color:inherit;text-decoration:none}",
      ".local-search-price{display:block;margin:4px 0;font-weight:600}",
      ".local-search-suggestion:hover,.local-search-suggestion:focus{background:#f3f5f6}",
      "@media(max-width:640px){.local-cart-item{align-items:flex-start;flex-direction:column}.local-cart-page{margin:20px auto;padding:16px}.product-item{min-width:0}.product-item__info,.product-item__info-inner{min-width:0}.product-item__title{font-size:14px;line-height:1.4;overflow-wrap:anywhere}.product-item__price-list{font-size:15px}.product-item__action-list .button,button[data-action=\"add-to-cart\"],.local-product-detail__add{min-height:44px}.collection__title,.product-meta__title{overflow-wrap:anywhere}.product-meta__title{font-size:23px;line-height:1.25}.collection__layout-button{min-width:44px;min-height:44px}.footer__link-item{display:inline-flex;align-items:center;min-height:44px}}",
      "@media(prefers-reduced-motion:reduce){button[data-action=\"add-to-cart\"],.local-product-detail__add{transition:none}}"
    ].join("");
    document.head.appendChild(style);
  }

  function directLinkLabel(link) {
    return Array.from(link.childNodes).filter(function (node) {
      return node.nodeType === Node.TEXT_NODE;
    }).map(function (node) {
      return node.textContent;
    }).join("").trim();
  }

  function removeNavigationItem(link) {
    var item = link.closest("li");

    if (item) {
      item.remove();
    }
  }

  function simplifyNavigation() {
    document.querySelectorAll(".nav-bar__linklist > .nav-bar__item > .nav-bar__link").forEach(function (link) {
      var label = directLinkLabel(link).toLocaleLowerCase();

      if (label === "home" || label === "gamers setup") {
        removeNavigationItem(link);
      }
    });

    document.querySelectorAll(".mobile-menu__nav a.mobile-menu__nav-link").forEach(function (link) {
      var label = link.textContent.trim().toLocaleLowerCase();

      if (label === "home" || label === "gamers setup" || label === "consoles") {
        removeNavigationItem(link);
      }
    });

    document.querySelectorAll(".mobile-menu__nav > .mobile-menu__nav-item > button.mobile-menu__nav-link").forEach(function (button) {
      var label = button.textContent.trim().toLocaleLowerCase();

      if (label === "home" || label === "gamers setup") {
        removeNavigationItem(button);
      }
    });

    document.querySelectorAll(".nav-dropdown__link").forEach(function (link) {
      if (link.textContent.trim().toLocaleLowerCase() === "consoles") {
        removeNavigationItem(link);
      }
    });
  }

  function productPageUrl(product, returnUrl, price) {
    var params = new URLSearchParams({ url: product.url });

    if (returnUrl) {
      params.set("return", returnUrl);
    }

    if (Number.isFinite(price) && price >= 0) {
      params.set("price", String(price));
    }

    return "/product.html?" + params.toString();
  }

  function getProductPrice(link) {
    var productCard = link.closest(".product-item");
    var priceElement = productCard && productCard.querySelector(".product-item__price-list .price");
    var priceMatch = priceElement && priceElement.textContent.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);

    return priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null;
  }

  function currentPageUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function searchResultsUrl(query) {
    return "/search?q=" + encodeURIComponent(query) + "&type=product";
  }

  function safeReturnUrl(returnUrl, product) {
    if (!returnUrl) {
      return searchResultsUrl(product.title);
    }

    try {
      var url = new URL(returnUrl, window.location.origin);

      if (url.origin === window.location.origin && url.pathname !== "/product.html" &&
        !url.pathname.endsWith("/product.html")) {
        return url.pathname + url.search + url.hash;
      }
    } catch (error) {
      console.error("Unable to read the product return link.", error);
    }

    return searchResultsUrl(product.title);
  }

  function liveCollectionUrl(url) {
    return "https://www.gamers-stop.com" + url.pathname + url.search + url.hash;
  }

  function getPaginationTarget(url) {
    var snapshotMatch = url.pathname.match(/^(\/collections\/[^/]+)@page=(\d+)$/);
    if (snapshotMatch) {
      var snapshotPage = Number(snapshotMatch[2]);
      return Number.isSafeInteger(snapshotPage) && snapshotPage > 1
        ? { page: snapshotPage, path: snapshotMatch[1] }
        : null;
    }

    var page = Number(new URLSearchParams(url.search).get("page"));

    if (!/^\/collections\/[^/]+\/?$/.test(url.pathname) ||
      !Number.isSafeInteger(page) || page < 1) {
      return null;
    }

    return { page: page, path: url.pathname.replace(/\/+$/, "") };
  }

  function localCollectionPagePath(target) {
    return target.path + (target.page === 1 ? "" : "@page=" + target.page);
  }

  function hasSavedCollectionPage(path, page) {
    return fetch(path).then(function (response) {
      if (!response.ok) {
        return false;
      }

      return response.text().then(function (html) {
        var snapshot = new DOMParser().parseFromString(html, "text/html");
        var activePage = snapshot.querySelector(".pagination__nav-item.is-active");

        if (!activePage || Number(activePage.textContent.trim()) !== page) {
          console.error("The saved collection page does not match page " + page + ".");
          return false;
        }

        return true;
      });
    }).catch(function (error) {
      console.error("Unable to check the saved collection page.", error);
      return false;
    });
  }

  function normalizePaginationLinks(root) {
    root.querySelectorAll(".pagination a[href]").forEach(function (link) {
      var url = new URL(link.href, window.location.href);

      if (getPaginationTarget(url)) {
        link.href = liveCollectionUrl(url);
        link.removeAttribute("target");
        link.rel = "";
      }
    });
  }

  function enableLocalCollectionPagination() {
    normalizePaginationLinks(document);

    window.addEventListener("click", function (event) {
      if (!(event.target instanceof Element) || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      var link = event.target.closest(".pagination a[href]");
      if (!link || link.hasAttribute("download")) {
        return;
      }

      var url = new URL(link.href, window.location.href);
      var target = getPaginationTarget(url);
      if (!target) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      var remainingParams = new URLSearchParams(url.search);
      remainingParams.delete("page");
      if (remainingParams.toString()) {
        window.location.assign(liveCollectionUrl(url));
        return;
      }

      var snapshotPath = localCollectionPagePath(target);
      hasSavedCollectionPage(snapshotPath, target.page).then(function (available) {
        window.location.assign(available ? snapshotPath : liveCollectionUrl(url));
      });
    }, true);
  }

  function enableLocalProductNavigation() {
    window.addEventListener("click", function (event) {
      if (!(event.target instanceof Element) || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      var link = event.target.closest("a[href]");

      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }

      var linkUrl = new URL(link.href, window.location.href);
      var productPath = linkUrl.pathname;
      var match = productPath.match(/\/products\/([^/]+)\/?$/);

      if (productPath === "/product.html") {
        var localProductUrl = linkUrl.searchParams.get("url");

        if (!localProductUrl || !localProductUrl.startsWith("/products/")) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        linkUrl.searchParams.set("return", currentPageUrl());
        var linkedProductPrice = getProductPrice(link);
        if (linkedProductPrice !== null) {
          linkUrl.searchParams.set("price", String(linkedProductPrice));
        }
        window.location.assign(linkUrl.pathname + linkUrl.search + linkUrl.hash);
        return;
      }

      if (!match) {
        return;
      }

      var slug;
      try {
        slug = decodeURIComponent(match[1]);
      } catch (error) {
        console.error("Unable to read the product link.", error);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      loadProductIndex().then(function (products) {
        var product = products.find(function (entry) {
          return entry.url.split("/").pop() === slug;
        });

        if (!product) {
          announce("This product is not available in the downloaded catalog.", true);
          return;
        }

        window.location.assign(productPageUrl(product, currentPageUrl(), getProductPrice(link)));
      }).catch(function (error) {
        console.error("Unable to open the selected product.", error);
        announce("This product could not be opened. Please try again.", true);
      });
    }, true);
  }

  function renderLocalProductPage() {
    var container = document.getElementById("local-product-detail");

    if (!container) {
      return;
    }

    var productUrl = new URLSearchParams(window.location.search).get("url");

    if (!productUrl || !productUrl.startsWith("/products/")) {
      container.textContent = "This product could not be found in the local catalog.";
      return;
    }

    Promise.all([loadProductIndex(), loadProductImages()]).then(function (results) {
      var product = results[0].find(function (entry) {
          return entry.url === productUrl;
        });
      var images = results[1];

      if (!product) {
        throw new Error("The requested product is not in the local catalog.");
      }

      var imageUrl = images[product.url.split("/").pop()];
      if (typeof imageUrl !== "string" || !imageUrl) {
        throw new Error("The requested product image is not in the local catalog.");
      }

      var heading = createElement("h1", "local-product-detail__title", product.title);
      var priceParam = new URLSearchParams(window.location.search).get("price");
      var priceValue = priceParam === null || priceParam.trim() === "" ? NaN : Number(priceParam);
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        priceValue = product.price;
      }
      var detailPrice = Number.isFinite(priceValue) && priceValue >= 0
        ? createElement("p", "local-product-detail__price", formatCatalogPrice(priceValue))
        : null;
      var addToCart = createElement("button", "button button--primary local-product-detail__add", "Add to cart");
      var image = createElement("img", "local-product-detail__image");
      image.src = imageUrl.replace("{width}x", "800x");
      image.alt = product.title;
      image.loading = "eager";
      image.addEventListener("error", function () {
        image.hidden = true;
        console.error("Unable to load the product image for " + product.url + ".");
      });
      var searchLink = createElement("a", "local-product-detail__link", "Back to search results");
      searchLink.href = safeReturnUrl(new URLSearchParams(window.location.search).get("return"), product);
      container.replaceChildren(heading);
      if (detailPrice) {
        container.appendChild(detailPrice);
      } else {
        container.appendChild(createElement("p", "local-product-detail__price", "Price to confirm"));
      }
      if (addToCart) {
        addToCart.type = "button";
        addToCart.dataset.action = "add-to-cart";
        addToCart.dataset.localAddCart = "true";
        addToCart.dataset.productUrl = product.url;
        addToCart.dataset.productTitle = product.title;
        addToCart.dataset.productPrice = Number.isFinite(priceValue) ? String(priceValue) : "";
        container.appendChild(addToCart);
      }
      container.append(image, searchLink);
      document.title = product.title + " | Gamers Stop";
    }).catch(function (error) {
      console.error("Unable to load the local product page.", error);
      container.textContent = "This product could not be loaded. Please return to search and try again.";
    });
  }

  function enableLocalPredictiveSearch() {
    window.addEventListener("input", function (event) {
      var input = event.target.closest(".search-bar__input");

      if (!input) {
        return;
      }

      event.stopImmediatePropagation();
      var form = input.closest("form");
      var resultPanel = form && form.querySelector(".search-bar__results");
      var resultList = resultPanel && resultPanel.querySelector(".search-bar__results-inner");

      if (!resultPanel || !resultList) {
        return;
      }

      var query = input.value.trim();
      resultList.replaceChildren();

      if (!query) {
        resultPanel.setAttribute("aria-hidden", "true");
        return;
      }

      resultPanel.setAttribute("aria-hidden", "false");
      resultList.appendChild(createElement("p", "local-search-loading", "Searching products..."));

      loadProductIndex().then(function (products) {
        if (!input.value.trim()) {
          return;
        }

        var matches = findProducts(products, input.value.trim());
        resultList.replaceChildren();

        if (!matches.length) {
          resultList.appendChild(createElement("p", "local-search-empty", "No matching products found."));
          return;
        }

        matches.slice(0, 5).forEach(function (product) {
          var result = createElement("div", "local-search-result product-item");
          var link = createElement("a", "local-search-suggestion product-item__title");
          link.href = productPageUrl(product, searchResultsUrl(input.value.trim()), product.price);
          link.appendChild(createElement("span", "", product.title));
          result.appendChild(link);
          if (Number.isFinite(product.price) && product.price >= 0) {
            var priceList = createElement("div", "product-item__price-list price-list");
            priceList.appendChild(createElement("span", "price local-search-price", formatCatalogPrice(product.price)));
            result.appendChild(priceList);
          } else {
            result.appendChild(createElement("span", "local-search-price", "Price to confirm"));
          }
          result.appendChild(createSearchAddForm(product));
          resultList.appendChild(result);
        });

        var viewAll = createElement("a", "local-search-suggestion text--strong", "View all results");
        viewAll.href = "/search?q=" + encodeURIComponent(input.value.trim()) + "&type=product";
        resultList.appendChild(viewAll);
      }).catch(function (error) {
        console.error("Unable to load predictive search results.", error);
        resultList.replaceChildren(createElement("p", "local-search-error", "Search suggestions could not be loaded."));
      });
    }, true);
  }

  window.addEventListener("submit", function (event) {
    var form = event.target;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (form.action.endsWith("/cart/add")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      addProduct(form);
      return;
    }

    if (form.action.endsWith("/account/login") || form.action.endsWith("/account") ||
      form.action.endsWith("/account/recover") || form.action.includes("/contact")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      announce("This static catalog has no account or newsletter service connected.", true);
    }
  }, true);

  window.addEventListener("click", function (event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    var expandableToggle = event.target.closest(".expandable-content__toggle");

    if (expandableToggle) {
      event.preventDefault();
      event.stopImmediatePropagation();

      var expandableContent = expandableToggle.closest(".expandable-content");

      if (!expandableContent) {
        console.error("The View more button is missing its expandable content.");
        return;
      }

      var expanded = expandableContent.getAttribute("aria-expanded") === "true";
      expandableContent.setAttribute("aria-expanded", String(!expanded));
      expandableToggle.setAttribute("aria-expanded", String(!expanded));

      var toggleText = expandableToggle.querySelector(".expandable-content__toggle-text");

      if (toggleText) {
        var labelAttribute = expanded ? "data-view-more" : "data-view-less";
        toggleText.textContent = toggleText.getAttribute(labelAttribute) || (expanded ? "View more" : "View less");
      }

      return;
    }

    var addButton = event.target.closest('button[data-action="add-to-cart"]');

    if (addButton) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (addButton.dataset.localAddCart === "true") {
        addProductFromButton(addButton);
      } else {
        var addForm = addButton.closest("form");
        if (addForm) {
          addProduct(addForm);
        }
      }

      return;
    }

    var remove = event.target.closest("[data-cart-remove]");

    if (remove) {
      cart = cart.filter(function (item) {
        return item.id !== remove.dataset.cartRemove;
      });
      saveCart();
      return;
    }

    var payment = event.target.closest(".shopify-payment-button, shopify-accelerated-checkout");

    if (payment) {
      event.preventDefault();
      event.stopImmediatePropagation();
      announce("Checkout is unavailable on this static demo site.", true);
    }
  }, true);

  document.addEventListener("change", function (event) {
    var input = event.target.closest("[data-cart-quantity]");

    if (!input) {
      return;
    }

    var quantity = Number.parseInt(input.value, 10);

    if (!Number.isInteger(quantity) || quantity < 1) {
      announce("Quantity must be at least 1.", true);
      renderCart();
      return;
    }

    var item = cart.find(function (entry) {
      return entry.id === input.dataset.cartQuantity;
    });

    if (item) {
      item.quantity = Math.min(quantity, 99);
      saveCart();
    }
  });

  addStyles();
  useSiteLogoAsFavicon();
  useSiteLogoInHeader();
  removeNewsletterSignup();
  updateSocialLinks();
  addWhatsAppContactButton();
  simplifyNavigation();
  renderCart();
  renderLocalProductPage();
  enableLocalCollectionPagination();
  enableLocalProductNavigation();
  enableLocalCollectionAddButtons();
  enableLocalPredictiveSearch();
  document.documentElement.addEventListener("cart:refresh", function () {
    window.setTimeout(renderCart, 300);
  });
  window.addEventListener("pageshow", function () {
    window.setTimeout(renderCart, 300);
  });
  window.addEventListener("load", function () {
    window.setTimeout(renderCart, 500);
  });
})();
