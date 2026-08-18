var AicooCoordinatorDesignSystem_42e5f1 = (function(exports, react) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	//#endregion
	react = __toESM(react, 1);
	//#region components/core/Badge.jsx
	const VARIANTS$1 = {
		default: {
			background: "hsl(var(--primary))",
			color: "hsl(var(--primary-foreground))",
			borderColor: "transparent"
		},
		secondary: {
			background: "hsl(var(--secondary))",
			color: "hsl(var(--secondary-foreground))",
			borderColor: "transparent"
		},
		destructive: {
			background: "hsl(var(--destructive))",
			color: "hsl(var(--destructive-foreground))",
			borderColor: "transparent"
		},
		outline: {
			background: "transparent",
			color: "hsl(var(--foreground))",
			borderColor: "hsl(var(--border))"
		}
	};
	function Badge({ variant = "default", style, children, ...rest }) {
		const v = VARIANTS$1[variant] || VARIANTS$1.default;
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "inline-flex",
				alignItems: "center",
				gap: 4,
				borderRadius: "var(--radius-full)",
				border: "1px solid " + v.borderColor,
				padding: "2px 10px",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-xs)",
				lineHeight: "var(--leading-xs)",
				fontWeight: "var(--font-weight-semibold)",
				background: v.background,
				color: v.color,
				transition: "var(--transition-colors)",
				...style
			},
			...rest
		}, children);
	}
	//#endregion
	//#region components/core/Button.jsx
	const VARIANTS = {
		default: {
			bg: "hsl(var(--primary))",
			fg: "hsl(var(--primary-foreground))",
			hoverBg: "hsl(var(--primary) / 0.9)",
			border: "1px solid transparent"
		},
		destructive: {
			bg: "hsl(var(--destructive))",
			fg: "hsl(var(--destructive-foreground))",
			hoverBg: "hsl(var(--destructive) / 0.9)",
			border: "1px solid transparent"
		},
		outline: {
			bg: "hsl(var(--background))",
			fg: "hsl(var(--muted-foreground))",
			hoverBg: "hsl(var(--accent))",
			hoverFg: "hsl(var(--accent-foreground))",
			border: "1px solid hsl(var(--input))"
		},
		secondary: {
			bg: "hsl(var(--secondary))",
			fg: "hsl(var(--secondary-foreground))",
			hoverBg: "hsl(var(--secondary) / 0.8)",
			border: "1px solid transparent"
		},
		ghost: {
			bg: "transparent",
			fg: "inherit",
			hoverBg: "hsl(var(--accent))",
			hoverFg: "hsl(var(--accent-foreground))",
			border: "1px solid transparent"
		},
		link: {
			bg: "transparent",
			fg: "hsl(var(--primary))",
			hoverBg: "transparent",
			underline: true,
			border: "1px solid transparent"
		}
	};
	const SIZES = {
		default: {
			height: 40,
			padding: "8px 16px"
		},
		sm: {
			height: 36,
			padding: "0 12px"
		},
		lg: {
			height: 44,
			padding: "0 32px"
		},
		icon: {
			height: 40,
			width: 40,
			padding: 0
		}
	};
	function Button({ variant = "default", size = "default", disabled, style, children, ...rest }) {
		const [hover, setHover] = react.default.useState(false);
		const v = VARIANTS[variant] || VARIANTS.default;
		const s = SIZES[size] || SIZES.default;
		const on = hover && !disabled;
		return /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			disabled,
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				gap: 8,
				whiteSpace: "nowrap",
				borderRadius: "var(--radius-md)",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				lineHeight: "var(--leading-sm)",
				fontWeight: "var(--font-weight-medium)",
				height: s.height,
				width: s.width,
				padding: s.padding,
				border: v.border,
				background: on && v.hoverBg ? v.hoverBg : v.bg,
				color: on && v.hoverFg ? v.hoverFg : v.fg,
				textDecoration: v.underline && on ? "underline" : "none",
				textUnderlineOffset: 4,
				cursor: disabled ? "default" : "pointer",
				opacity: disabled ? .5 : 1,
				pointerEvents: disabled ? "none" : void 0,
				transition: "var(--transition-colors)",
				...style
			},
			...rest
		}, children);
	}
	//#endregion
	//#region components/core/Card.jsx
	function Card({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				borderRadius: "var(--radius-lg)",
				border: "1px solid hsl(var(--border))",
				background: "hsl(var(--card))",
				color: "hsl(var(--card-foreground))",
				boxShadow: "var(--shadow-sm)",
				...style
			},
			...rest
		}, children);
	}
	function CardHeader({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 6,
				padding: 24,
				...style
			},
			...rest
		}, children);
	}
	function CardTitle({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("h3", {
			style: {
				margin: 0,
				fontSize: "var(--text-2xl)",
				lineHeight: 1,
				fontWeight: "var(--font-weight-semibold)",
				letterSpacing: "var(--tracking-tight)",
				...style
			},
			...rest
		}, children);
	}
	function CardDescription({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("p", {
			style: {
				margin: 0,
				fontSize: "var(--text-sm)",
				lineHeight: "var(--leading-sm)",
				color: "hsl(var(--muted-foreground))",
				...style
			},
			...rest
		}, children);
	}
	function CardContent({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				padding: "0 24px 24px",
				...style
			},
			...rest
		}, children);
	}
	function CardFooter({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				alignItems: "center",
				padding: "0 24px 24px",
				...style
			},
			...rest
		}, children);
	}
	//#endregion
	//#region components/core/Link.jsx
	function Link({ href = "#", style, children, ...rest }) {
		const [hover, setHover] = react.default.useState(false);
		return /* @__PURE__ */ react.default.createElement("a", {
			href,
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				color: "#3b82f6",
				fontSize: "var(--text-sm)",
				textDecoration: hover ? "underline" : "none",
				...style
			},
			...rest
		}, children);
	}
	//#endregion
	//#region components/core/Progress.jsx
	function Progress({ value = 0, style, ...rest }) {
		const v = Math.max(0, Math.min(100, value));
		return /* @__PURE__ */ react.default.createElement("div", {
			role: "progressbar",
			"aria-valuenow": v,
			style: {
				position: "relative",
				height: 16,
				width: "100%",
				overflow: "hidden",
				borderRadius: "var(--radius-full)",
				background: "hsl(var(--secondary))",
				...style
			},
			...rest
		}, /* @__PURE__ */ react.default.createElement("div", { style: {
			height: "100%",
			width: "100%",
			background: "hsl(var(--primary))",
			transform: "translateX(-" + (100 - v) + "%)",
			transition: "transform var(--duration) var(--ease-out)"
		} }));
	}
	//#endregion
	//#region components/core/Separator.jsx
	function Separator({ orientation = "horizontal", style, ...rest }) {
		const horizontal = orientation === "horizontal";
		return /* @__PURE__ */ react.default.createElement("div", {
			role: "separator",
			"aria-orientation": orientation,
			style: {
				flexShrink: 0,
				background: "hsl(var(--border))",
				height: horizontal ? 1 : "100%",
				width: horizontal ? "100%" : 1,
				...style
			},
			...rest
		});
	}
	//#endregion
	//#region components/core/Skeleton.jsx
	function Skeleton({ style, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				borderRadius: "var(--radius-md)",
				background: "hsl(var(--muted))",
				animation: "ds-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
				...style
			},
			...rest
		}, /* @__PURE__ */ react.default.createElement("style", null, "@keyframes ds-pulse{0%,100%{opacity:1}50%{opacity:.5}}"));
	}
	//#endregion
	//#region components/data/Table.jsx
	function Table({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "relative",
			width: "100%",
			overflow: "auto"
		} }, /* @__PURE__ */ react.default.createElement("table", {
			style: {
				width: "100%",
				captionSide: "bottom",
				borderCollapse: "collapse",
				fontSize: "var(--text-sm)",
				...style
			},
			...rest
		}, children));
	}
	function TableHeader({ children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("thead", rest, children);
	}
	function TableBody({ children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("tbody", rest, children);
	}
	function TableFooter({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("tfoot", {
			style: {
				borderTop: "1px solid hsl(var(--border))",
				background: "hsl(var(--muted) / 0.5)",
				fontWeight: "var(--font-weight-medium)",
				...style
			},
			...rest
		}, children);
	}
	function TableRow({ clickable, style, children, ...rest }) {
		const [hover, setHover] = react.default.useState(false);
		return /* @__PURE__ */ react.default.createElement("tr", {
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				borderBottom: "1px solid hsl(var(--border))",
				background: hover && clickable ? "hsl(var(--muted) / 0.5)" : "transparent",
				cursor: clickable ? "pointer" : "default",
				transition: "var(--transition-colors)",
				...style
			},
			...rest
		}, children);
	}
	function TableHead({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("th", {
			style: {
				height: 48,
				padding: "0 16px",
				textAlign: "left",
				verticalAlign: "middle",
				fontWeight: "var(--font-weight-medium)",
				color: "hsl(var(--muted-foreground))",
				...style
			},
			...rest
		}, children);
	}
	function TableCell({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("td", {
			style: {
				padding: 16,
				verticalAlign: "middle",
				...style
			},
			...rest
		}, children);
	}
	function TableCaption({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("caption", {
			style: {
				marginTop: 16,
				fontSize: "var(--text-sm)",
				color: "hsl(var(--muted-foreground))",
				...style
			},
			...rest
		}, children);
	}
	//#endregion
	//#region components/forms/Calendar.jsx
	const DOW = [
		"Su",
		"Mo",
		"Tu",
		"We",
		"Th",
		"Fr",
		"Sa"
	];
	const MONTHS$1 = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	];
	function Nav({ dir, onClick }) {
		const [hover, setHover] = react.default.useState(false);
		return /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick,
			"aria-label": dir < 0 ? "Previous month" : "Next month",
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				position: "absolute",
				top: 4,
				left: dir < 0 ? 4 : void 0,
				right: dir > 0 ? 4 : void 0,
				height: 28,
				width: 28,
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: "var(--radius-md)",
				border: "1px solid hsl(var(--input))",
				background: "transparent",
				color: "hsl(var(--muted-foreground))",
				padding: 0,
				cursor: "pointer",
				opacity: hover ? 1 : .5,
				transition: "opacity var(--duration-fast) var(--ease-out)"
			}
		}, /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		}, /* @__PURE__ */ react.default.createElement("path", { d: dir < 0 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6" })));
	}
	function Day({ day, selected, today, onSelect }) {
		const [hover, setHover] = react.default.useState(false);
		const background = selected ? "hsl(var(--primary))" : today ? "hsl(var(--accent))" : hover ? "hsl(var(--accent))" : "transparent";
		const color = selected ? "hsl(var(--primary-foreground))" : today || hover ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))";
		return /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick: onSelect,
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				height: 36,
				width: 36,
				padding: 0,
				border: "1px solid transparent",
				borderRadius: "var(--radius-md)",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				fontWeight: "var(--font-weight-normal)",
				background,
				color,
				cursor: "pointer",
				transition: "var(--transition-colors)"
			}
		}, day);
	}
	function Calendar({ month, selected, onSelect, style }) {
		const base = month ? new Date(month) : selected ? new Date(selected) : /* @__PURE__ */ new Date();
		const [view, setView] = react.default.useState(new Date(base.getFullYear(), base.getMonth(), 1));
		const startOffset = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
		const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
		const cells = [...Array(startOffset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
		const sel = selected ? new Date(selected) : null;
		const now = /* @__PURE__ */ new Date();
		const same = (d, other) => other && other.getDate() === d && other.getMonth() === view.getMonth() && other.getFullYear() === view.getFullYear();
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			padding: 12,
			fontFamily: "var(--font-sans)",
			...style
		} }, /* @__PURE__ */ react.default.createElement("div", { style: {
			display: "flex",
			flexDirection: "column",
			gap: 16
		} }, /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "relative",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			paddingTop: 4
		} }, /* @__PURE__ */ react.default.createElement(Nav, {
			dir: -1,
			onClick: () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
		}), /* @__PURE__ */ react.default.createElement("span", { style: {
			fontSize: "var(--text-sm)",
			fontWeight: "var(--font-weight-medium)"
		} }, MONTHS$1[view.getMonth()], " ", view.getFullYear()), /* @__PURE__ */ react.default.createElement(Nav, {
			dir: 1,
			onClick: () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
		})), /* @__PURE__ */ react.default.createElement("div", null, /* @__PURE__ */ react.default.createElement("div", { style: { display: "flex" } }, DOW.map((d) => /* @__PURE__ */ react.default.createElement("div", {
			key: d,
			style: {
				width: 36,
				textAlign: "center",
				borderRadius: "var(--radius-md)",
				fontSize: "0.8rem",
				fontWeight: "var(--font-weight-normal)",
				color: "hsl(var(--muted-foreground))"
			}
		}, d))), /* @__PURE__ */ react.default.createElement("div", { style: {
			display: "grid",
			gridTemplateColumns: "repeat(7, 36px)",
			marginTop: 8,
			rowGap: 8
		} }, cells.map((d, i) => d === null ? /* @__PURE__ */ react.default.createElement("div", {
			key: "e" + i,
			style: {
				height: 36,
				width: 36
			}
		}) : /* @__PURE__ */ react.default.createElement(Day, {
			key: d,
			day: d,
			selected: same(d, sel),
			today: same(d, now),
			onSelect: () => onSelect && onSelect(new Date(view.getFullYear(), view.getMonth(), d))
		}))))));
	}
	//#endregion
	//#region components/forms/Checkbox.jsx
	function Checkbox({ checked, defaultChecked, onCheckedChange, disabled, style, ...rest }) {
		const [internal, setInternal] = react.default.useState(!!defaultChecked);
		const isControlled = checked !== void 0;
		const on = isControlled ? checked : internal;
		return /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			role: "checkbox",
			"aria-checked": !!on,
			disabled,
			onClick: () => {
				if (!isControlled) setInternal(!on);
				onCheckedChange && onCheckedChange(!on);
			},
			style: {
				height: 16,
				width: 16,
				flexShrink: 0,
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: "var(--radius-sm)",
				border: "1px solid hsl(var(--primary))",
				background: on ? "hsl(var(--primary))" : "transparent",
				color: "hsl(var(--primary-foreground))",
				padding: 0,
				cursor: disabled ? "not-allowed" : "pointer",
				opacity: disabled ? .5 : 1,
				...style
			},
			...rest
		}, on ? /* @__PURE__ */ react.default.createElement("svg", {
			width: "14",
			height: "14",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "3",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		}, /* @__PURE__ */ react.default.createElement("path", { d: "M20 6 9 17l-5-5" })) : null);
	}
	//#endregion
	//#region components/forms/Command.jsx
	function Command({ placeholder = "Search...", groups = [], emptyMessage = "No results found.", onSelect, style }) {
		const [query, setQuery] = react.default.useState("");
		const q = query.trim().toLowerCase();
		const filtered = groups.map((g) => ({
			...g,
			items: g.items.filter((i) => !q || i.label.toLowerCase().includes(q))
		})).filter((g) => g.items.length);
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			display: "flex",
			height: "100%",
			width: "100%",
			flexDirection: "column",
			overflow: "hidden",
			borderRadius: "var(--radius-md)",
			background: "hsl(var(--popover))",
			color: "hsl(var(--popover-foreground))",
			...style
		} }, /* @__PURE__ */ react.default.createElement("div", { style: {
			display: "flex",
			alignItems: "center",
			borderBottom: "1px solid hsl(var(--border))",
			padding: "0 12px"
		} }, /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			style: {
				marginRight: 8,
				flexShrink: 0,
				opacity: .5
			}
		}, /* @__PURE__ */ react.default.createElement("circle", {
			cx: "11",
			cy: "11",
			r: "8"
		}), /* @__PURE__ */ react.default.createElement("path", { d: "m21 21-4.3-4.3" })), /* @__PURE__ */ react.default.createElement("input", {
			value: query,
			onChange: (e) => setQuery(e.target.value),
			placeholder,
			style: {
				display: "flex",
				height: 44,
				width: "100%",
				borderRadius: "var(--radius-md)",
				border: "none",
				background: "transparent",
				padding: "12px 0",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				color: "inherit",
				outline: "none"
			}
		})), /* @__PURE__ */ react.default.createElement("div", { style: {
			maxHeight: 300,
			overflowY: "auto",
			overflowX: "hidden",
			overscrollBehavior: "contain"
		} }, filtered.length === 0 ? /* @__PURE__ */ react.default.createElement("div", { style: {
			padding: "24px 0",
			textAlign: "center",
			fontSize: "var(--text-sm)"
		} }, emptyMessage) : null, filtered.map((g) => /* @__PURE__ */ react.default.createElement("div", {
			key: g.label || "group",
			style: {
				overflow: "hidden",
				padding: 4,
				color: "hsl(var(--foreground))"
			}
		}, g.label ? /* @__PURE__ */ react.default.createElement("div", { style: {
			padding: "6px 8px",
			fontSize: "var(--text-xs)",
			fontWeight: "var(--font-weight-medium)",
			color: "hsl(var(--muted-foreground))"
		} }, g.label) : null, g.items.map((i) => /* @__PURE__ */ react.default.createElement(CommandItem, {
			key: i.value,
			item: i,
			onSelect
		}))))));
	}
	function CommandItem({ item, onSelect }) {
		const [hover, setHover] = react.default.useState(false);
		return /* @__PURE__ */ react.default.createElement("div", {
			role: "option",
			"aria-selected": hover,
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			onClick: () => onSelect && onSelect(item.value),
			style: {
				position: "relative",
				display: "flex",
				alignItems: "center",
				gap: 8,
				borderRadius: "var(--radius-sm)",
				padding: "6px 8px",
				fontSize: "var(--text-sm)",
				cursor: "default",
				userSelect: "none",
				background: hover ? "hsl(var(--accent))" : "transparent",
				color: hover ? "hsl(var(--accent-foreground))" : "inherit"
			}
		}, item.icon, item.label, item.shortcut ? /* @__PURE__ */ react.default.createElement("span", { style: {
			marginLeft: "auto",
			fontSize: "var(--text-xs)",
			letterSpacing: "var(--tracking-widest)",
			color: "hsl(var(--muted-foreground))"
		} }, item.shortcut) : null);
	}
	//#endregion
	//#region components/forms/DatePicker.jsx
	const ORD = (n) => {
		const s = [
			"th",
			"st",
			"nd",
			"rd"
		];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	};
	const MONTHS = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	];
	const formatPPP = (d) => {
		const date = new Date(d);
		return MONTHS[date.getMonth()] + " " + ORD(date.getDate()) + ", " + date.getFullYear();
	};
	function DatePicker({ value, defaultValue, onChange, placeholder = "Pick a date", style }) {
		const [open, setOpen] = react.default.useState(false);
		const [hover, setHover] = react.default.useState(false);
		const [internal, setInternal] = react.default.useState(defaultValue || null);
		const current = value !== void 0 ? value : internal;
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "relative",
			width: 240,
			...style
		} }, /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick: () => setOpen(!open),
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				display: "inline-flex",
				height: 40,
				width: "100%",
				alignItems: "center",
				justifyContent: "flex-start",
				gap: 0,
				borderRadius: "var(--radius-md)",
				border: "1px solid hsl(var(--input))",
				background: hover ? "hsl(var(--accent))" : "hsl(var(--background))",
				color: current ? hover ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
				padding: "8px 16px",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				fontWeight: "var(--font-weight-normal)",
				textAlign: "left",
				cursor: "pointer",
				transition: "var(--transition-colors)"
			}
		}, /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				marginRight: 8,
				flexShrink: 0
			}
		}, /* @__PURE__ */ react.default.createElement("path", { d: "M8 2v4M16 2v4" }), /* @__PURE__ */ react.default.createElement("rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "4",
			rx: "2"
		}), /* @__PURE__ */ react.default.createElement("path", { d: "M3 10h18" })), current ? formatPPP(current) : placeholder), open ? /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "absolute",
			zIndex: 50,
			top: "calc(100% + 4px)",
			left: 0,
			width: "auto",
			borderRadius: "var(--radius-md)",
			border: "1px solid hsl(var(--border))",
			background: "hsl(var(--popover))",
			color: "hsl(var(--popover-foreground))",
			boxShadow: "var(--shadow-md)"
		} }, /* @__PURE__ */ react.default.createElement(Calendar, {
			selected: current,
			onSelect: (d) => {
				if (value === void 0) setInternal(d);
				onChange && onChange(d);
				setOpen(false);
			}
		})) : null);
	}
	//#endregion
	//#region components/forms/Form.jsx
	function Form({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("form", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 24,
				...style
			},
			...rest
		}, children);
	}
	function FormItem({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 8,
				position: "relative",
				...style
			},
			...rest
		}, children);
	}
	function FormLabel({ invalid, style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("label", {
			style: {
				fontSize: "var(--text-sm)",
				fontWeight: "var(--font-weight-medium)",
				lineHeight: 1,
				color: invalid ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
				...style
			},
			...rest
		}, children);
	}
	function FormControl({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				position: "relative",
				...style
			},
			...rest
		}, children);
	}
	function FormDescription({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("p", {
			style: {
				margin: 0,
				fontSize: "var(--text-sm)",
				color: "hsl(var(--muted-foreground))",
				...style
			},
			...rest
		}, children);
	}
	function FormMessage({ style, children, ...rest }) {
		if (!children) return null;
		return /* @__PURE__ */ react.default.createElement("p", {
			style: {
				margin: 0,
				fontSize: "var(--text-sm)",
				fontWeight: "var(--font-weight-medium)",
				color: "hsl(var(--destructive))",
				...style
			},
			...rest
		}, children);
	}
	//#endregion
	//#region components/forms/Input.jsx
	function Input({ style, invalid, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("input", {
			style: {
				display: "flex",
				height: 40,
				width: "100%",
				boxSizing: "border-box",
				borderRadius: "var(--radius-md)",
				border: "1px solid " + (invalid ? "hsl(var(--destructive))" : "hsl(var(--input))"),
				background: "hsl(var(--background))",
				color: "hsl(var(--foreground))",
				padding: "8px 12px",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				lineHeight: "var(--leading-sm)",
				outline: "none",
				...style
			},
			...rest
		});
	}
	//#endregion
	//#region components/forms/Label.jsx
	function Label({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("label", {
			style: {
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				fontWeight: "var(--font-weight-medium)",
				lineHeight: 1,
				...style
			},
			...rest
		}, children);
	}
	//#endregion
	//#region components/forms/MultiSelect.jsx
	const XCircle = ({ onClick }) => /* @__PURE__ */ react.default.createElement("svg", {
		onClick,
		width: "16",
		height: "16",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		style: {
			marginLeft: 8,
			flexShrink: 0,
			cursor: "pointer"
		}
	}, /* @__PURE__ */ react.default.createElement("circle", {
		cx: "12",
		cy: "12",
		r: "10"
	}), /* @__PURE__ */ react.default.createElement("path", { d: "m15 9-6 6M9 9l6 6" }));
	const Chevron = () => /* @__PURE__ */ react.default.createElement("svg", {
		width: "16",
		height: "16",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		style: {
			margin: "0 8px",
			flexShrink: 0,
			color: "hsl(var(--muted-foreground))"
		}
	}, /* @__PURE__ */ react.default.createElement("path", { d: "m6 9 6 6 6-6" }));
	function CheckBox({ on }) {
		return /* @__PURE__ */ react.default.createElement("span", { style: {
			marginRight: 8,
			display: "inline-flex",
			height: 16,
			width: 16,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: "var(--radius-sm)",
			border: "1px solid hsl(var(--primary))",
			background: on ? "hsl(var(--primary))" : "transparent",
			color: "hsl(var(--primary-foreground))",
			opacity: on ? 1 : .5
		} }, on ? /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		}, /* @__PURE__ */ react.default.createElement("path", { d: "M20 6 9 17l-5-5" })) : null);
	}
	function Row({ label, on, onClick }) {
		const [hover, setHover] = react.default.useState(false);
		return /* @__PURE__ */ react.default.createElement("div", {
			onClick,
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				borderRadius: "var(--radius-sm)",
				padding: "6px 8px",
				fontSize: "var(--text-sm)",
				cursor: "pointer",
				background: hover ? "hsl(var(--accent))" : "transparent",
				color: hover ? "hsl(var(--accent-foreground))" : "inherit"
			}
		}, /* @__PURE__ */ react.default.createElement(CheckBox, { on }), /* @__PURE__ */ react.default.createElement("span", null, label));
	}
	function MultiSelect({ options = [], value, defaultValue = [], onValueChange, placeholder = "Select options", maxCount = 3, width, style }) {
		const [open, setOpen] = react.default.useState(false);
		const [internal, setInternal] = react.default.useState(defaultValue);
		const selected = value !== void 0 ? value : internal;
		const set = (next) => {
			if (value === void 0) setInternal(next);
			onValueChange && onValueChange(next);
		};
		const toggle = (v) => set(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
		const allOn = selected.length === options.length;
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "relative",
			width: width || "100%",
			...style
		} }, /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick: () => setOpen(!open),
			style: {
				display: "flex",
				width: "100%",
				minHeight: 40,
				height: "auto",
				alignItems: "center",
				justifyContent: "space-between",
				borderRadius: "var(--radius-md)",
				border: "1px solid hsl(var(--input))",
				background: "inherit",
				padding: 4,
				cursor: "pointer",
				fontFamily: "var(--font-sans)",
				color: "inherit"
			}
		}, selected.length > 0 ? /* @__PURE__ */ react.default.createElement("span", { style: {
			display: "flex",
			width: "100%",
			alignItems: "center",
			justifyContent: "space-between"
		} }, /* @__PURE__ */ react.default.createElement("span", { style: {
			display: "flex",
			flexWrap: "wrap",
			alignItems: "center",
			overflow: "hidden"
		} }, selected.slice(0, maxCount).map((v) => {
			const o = options.find((x) => x.value === v);
			return /* @__PURE__ */ react.default.createElement("span", {
				key: v,
				style: {
					display: "inline-flex",
					alignItems: "center",
					margin: 4,
					maxWidth: 200,
					borderRadius: "var(--radius-full)",
					border: "1px solid hsl(var(--foreground) / 0.1)",
					background: "hsl(var(--card))",
					color: "hsl(var(--foreground))",
					padding: "2px 10px",
					fontSize: "var(--text-xs)",
					fontWeight: "var(--font-weight-semibold)"
				}
			}, /* @__PURE__ */ react.default.createElement("span", { style: {
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			} }, o ? o.label : v), /* @__PURE__ */ react.default.createElement(XCircle, { onClick: (e) => {
				e.stopPropagation();
				toggle(v);
			} }));
		}), selected.length > maxCount ? /* @__PURE__ */ react.default.createElement("span", { style: {
			display: "inline-flex",
			alignItems: "center",
			margin: 4,
			borderRadius: "var(--radius-full)",
			border: "1px solid hsl(var(--foreground) / 0.1)",
			background: "transparent",
			color: "hsl(var(--foreground))",
			padding: "2px 10px",
			fontSize: "var(--text-xs)",
			fontWeight: "var(--font-weight-semibold)"
		} }, "+ " + (selected.length - maxCount) + " more", /* @__PURE__ */ react.default.createElement(XCircle, { onClick: (e) => {
			e.stopPropagation();
			set(selected.slice(0, maxCount));
		} })) : null), /* @__PURE__ */ react.default.createElement("span", { style: {
			display: "flex",
			alignItems: "center",
			flexShrink: 0
		} }, /* @__PURE__ */ react.default.createElement("svg", {
			onClick: (e) => {
				e.stopPropagation();
				set([]);
			},
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			style: {
				margin: "0 8px",
				cursor: "pointer",
				color: "hsl(var(--muted-foreground))"
			}
		}, /* @__PURE__ */ react.default.createElement("path", { d: "M18 6 6 18M6 6l12 12" })), /* @__PURE__ */ react.default.createElement("span", { style: {
			display: "inline-block",
			width: 1,
			minHeight: 24,
			alignSelf: "stretch",
			background: "hsl(var(--border))"
		} }), /* @__PURE__ */ react.default.createElement(Chevron, null))) : /* @__PURE__ */ react.default.createElement("span", { style: {
			display: "flex",
			width: "100%",
			alignItems: "center",
			justifyContent: "space-between"
		} }, /* @__PURE__ */ react.default.createElement("span", { style: {
			margin: "0 12px",
			fontSize: "var(--text-sm)",
			color: "hsl(var(--muted-foreground))"
		} }, placeholder), /* @__PURE__ */ react.default.createElement(Chevron, null))), open ? /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "absolute",
			zIndex: 50,
			top: "calc(100% + 4px)",
			left: 0,
			width: "auto",
			minWidth: "100%",
			borderRadius: "var(--radius-md)",
			border: "1px solid hsl(var(--border))",
			background: "hsl(var(--popover))",
			color: "hsl(var(--popover-foreground))",
			boxShadow: "var(--shadow-md)",
			overflow: "hidden"
		} }, /* @__PURE__ */ react.default.createElement("div", { style: {
			display: "flex",
			alignItems: "center",
			borderBottom: "1px solid hsl(var(--border))",
			padding: "0 12px"
		} }, /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			style: {
				marginRight: 8,
				opacity: .5,
				flexShrink: 0
			}
		}, /* @__PURE__ */ react.default.createElement("circle", {
			cx: "11",
			cy: "11",
			r: "8"
		}), /* @__PURE__ */ react.default.createElement("path", { d: "m21 21-4.3-4.3" })), /* @__PURE__ */ react.default.createElement("input", {
			placeholder: "Search...",
			style: {
				height: 44,
				width: "100%",
				border: "none",
				background: "transparent",
				padding: "12px 0",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				color: "inherit",
				outline: "none"
			}
		})), /* @__PURE__ */ react.default.createElement("div", { style: {
			maxHeight: 300,
			overflowY: "auto",
			padding: 4
		} }, /* @__PURE__ */ react.default.createElement(Row, {
			label: "(Select All)",
			on: allOn,
			onClick: () => set(allOn ? [] : options.map((o) => o.value))
		}), options.map((o) => /* @__PURE__ */ react.default.createElement(Row, {
			key: o.value,
			label: o.label,
			on: selected.includes(o.value),
			onClick: () => toggle(o.value)
		}))), /* @__PURE__ */ react.default.createElement("div", { style: {
			borderTop: "1px solid hsl(var(--border))",
			display: "flex",
			alignItems: "center",
			padding: 4
		} }, selected.length > 0 ? /* @__PURE__ */ react.default.createElement(react.default.Fragment, null, /* @__PURE__ */ react.default.createElement("div", {
			onClick: () => set([]),
			style: {
				flex: 1,
				textAlign: "center",
				borderRadius: "var(--radius-sm)",
				padding: "6px 8px",
				fontSize: "var(--text-sm)",
				cursor: "pointer"
			}
		}, "Clear"), /* @__PURE__ */ react.default.createElement("span", { style: {
			width: 1,
			minHeight: 24,
			alignSelf: "stretch",
			background: "hsl(var(--border))"
		} })) : null, /* @__PURE__ */ react.default.createElement("div", {
			onClick: () => setOpen(false),
			style: {
				flex: 1,
				textAlign: "center",
				borderRadius: "var(--radius-sm)",
				padding: "6px 8px",
				fontSize: "var(--text-sm)",
				cursor: "pointer"
			}
		}, "Close"))) : null);
	}
	//#endregion
	//#region components/forms/RadioGroup.jsx
	const Ctx = react.default.createContext(null);
	function RadioGroup({ value, defaultValue, onValueChange, style, children, ...rest }) {
		const [internal, setInternal] = react.default.useState(defaultValue);
		const current = value !== void 0 ? value : internal;
		const set = (v) => {
			if (value === void 0) setInternal(v);
			onValueChange && onValueChange(v);
		};
		return /* @__PURE__ */ react.default.createElement(Ctx.Provider, { value: {
			current,
			set
		} }, /* @__PURE__ */ react.default.createElement("div", {
			role: "radiogroup",
			style: {
				display: "grid",
				gap: 8,
				...style
			},
			...rest
		}, children));
	}
	function RadioGroupItem({ value, disabled, style, ...rest }) {
		const ctx = react.default.useContext(Ctx);
		const on = ctx && ctx.current === value;
		return /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			role: "radio",
			"aria-checked": !!on,
			disabled,
			onClick: () => ctx && ctx.set(value),
			style: {
				height: 16,
				width: 16,
				aspectRatio: "1 / 1",
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: "var(--radius-full)",
				border: "1px solid hsl(var(--primary))",
				background: "transparent",
				color: "hsl(var(--primary))",
				padding: 0,
				cursor: disabled ? "not-allowed" : "pointer",
				opacity: disabled ? .5 : 1,
				...style
			},
			...rest
		}, on ? /* @__PURE__ */ react.default.createElement("svg", {
			width: "10",
			height: "10",
			viewBox: "0 0 24 24",
			fill: "currentColor"
		}, /* @__PURE__ */ react.default.createElement("circle", {
			cx: "12",
			cy: "12",
			r: "10"
		})) : null);
	}
	//#endregion
	//#region components/forms/Select.jsx
	function Select({ value, defaultValue, onValueChange, options = [], placeholder = "Select…", disabled, width, style, ...rest }) {
		const [open, setOpen] = react.default.useState(false);
		const [internal, setInternal] = react.default.useState(defaultValue);
		const current = value !== void 0 ? value : internal;
		const selected = options.find((o) => o.value === current);
		const pick = (v) => {
			if (value === void 0) setInternal(v);
			onValueChange && onValueChange(v);
			setOpen(false);
		};
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				position: "relative",
				width: width || "100%",
				...style
			},
			...rest
		}, /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			disabled,
			onClick: () => setOpen(!open),
			style: {
				display: "flex",
				height: 40,
				width: "100%",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 8,
				borderRadius: "var(--radius-md)",
				border: "1px solid hsl(var(--input))",
				background: "hsl(var(--background))",
				padding: "8px 12px",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				color: selected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
				cursor: disabled ? "not-allowed" : "pointer",
				opacity: disabled ? .5 : 1,
				textAlign: "left"
			}
		}, /* @__PURE__ */ react.default.createElement("span", { style: {
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		} }, selected ? selected.label : placeholder), /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			style: { opacity: .5 }
		}, /* @__PURE__ */ react.default.createElement("path", { d: "m6 9 6 6 6-6" }))), open ? /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "absolute",
			zIndex: 50,
			top: 44,
			left: 0,
			minWidth: "100%",
			maxHeight: 384,
			overflow: "auto",
			borderRadius: "var(--radius-md)",
			border: "1px solid hsl(var(--border))",
			background: "hsl(var(--popover))",
			color: "hsl(var(--popover-foreground))",
			boxShadow: "var(--shadow-md)",
			padding: 4
		} }, options.map((o) => /* @__PURE__ */ react.default.createElement(SelectItem, {
			key: o.value,
			label: o.label,
			selected: o.value === current,
			onSelect: () => pick(o.value)
		}))) : null);
	}
	function SelectItem({ label, selected, onSelect }) {
		const [hover, setHover] = react.default.useState(false);
		return /* @__PURE__ */ react.default.createElement("div", {
			role: "option",
			"aria-selected": !!selected,
			onClick: onSelect,
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				position: "relative",
				display: "flex",
				alignItems: "center",
				width: "100%",
				borderRadius: "var(--radius-sm)",
				padding: "6px 8px 6px 32px",
				fontSize: "var(--text-sm)",
				cursor: "default",
				userSelect: "none",
				background: hover ? "hsl(var(--accent))" : "transparent",
				color: hover ? "hsl(var(--accent-foreground))" : "inherit"
			}
		}, /* @__PURE__ */ react.default.createElement("span", { style: {
			position: "absolute",
			left: 8,
			display: "inline-flex",
			height: 14,
			width: 14,
			alignItems: "center",
			justifyContent: "center"
		} }, selected ? /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		}, /* @__PURE__ */ react.default.createElement("path", { d: "M20 6 9 17l-5-5" })) : null), label);
	}
	//#endregion
	//#region components/forms/Switch.jsx
	function Switch({ checked, defaultChecked, onCheckedChange, disabled, style, ...rest }) {
		const [internal, setInternal] = react.default.useState(!!defaultChecked);
		const isControlled = checked !== void 0;
		const on = isControlled ? checked : internal;
		return /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			role: "switch",
			"aria-checked": !!on,
			disabled,
			onClick: () => {
				if (!isControlled) setInternal(!on);
				onCheckedChange && onCheckedChange(!on);
			},
			style: {
				display: "inline-flex",
				alignItems: "center",
				height: 20,
				width: 36,
				flexShrink: 0,
				borderRadius: "var(--radius-full)",
				border: "2px solid transparent",
				boxShadow: "var(--shadow-sm)",
				padding: 0,
				background: on ? "hsl(var(--primary))" : "hsl(var(--input))",
				cursor: disabled ? "not-allowed" : "pointer",
				opacity: disabled ? .5 : 1,
				transition: "var(--transition-colors)",
				...style
			},
			...rest
		}, /* @__PURE__ */ react.default.createElement("span", { style: {
			display: "block",
			height: 16,
			width: 16,
			borderRadius: "var(--radius-full)",
			background: "hsl(var(--background))",
			boxShadow: "var(--shadow-lg)",
			transform: "translateX(" + (on ? 16 : 0) + "px)",
			transition: "transform var(--duration-fast) var(--ease-out)"
		} }));
	}
	//#endregion
	//#region components/forms/Textarea.jsx
	function Textarea({ style, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("textarea", {
			style: {
				display: "flex",
				minHeight: 80,
				width: "100%",
				boxSizing: "border-box",
				borderRadius: "var(--radius-md)",
				border: "1px solid hsl(var(--input))",
				background: "hsl(var(--background))",
				color: "hsl(var(--foreground))",
				padding: "8px 12px",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				lineHeight: "var(--leading-sm)",
				outline: "none",
				resize: "vertical",
				...style
			},
			...rest
		});
	}
	//#endregion
	//#region components/icons/Icon.jsx
	const pascal = (name) => String(name).split(/[-_ ]+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
	function childrenOf(node) {
		if (!node) return [];
		return Array.isArray(node[0]) ? node : node[2] || [];
	}
	function serialize(children) {
		return (children || []).map(([tag, attrs]) => {
			const a = Object.entries(attrs || {}).map(([k, v]) => k + "=\"" + v + "\"").join(" ");
			return "<" + tag + " " + a + "/>";
		}).join("");
	}
	function Icon({ name, size = 16, strokeWidth = 2, color = "currentColor", style, ...rest }) {
		const lucide = typeof window !== "undefined" ? window.lucide : null;
		const inner = serialize(childrenOf(lucide && lucide.icons ? lucide.icons[pascal(name)] : null));
		return /* @__PURE__ */ react.default.createElement("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			width: size,
			height: size,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: color,
			strokeWidth,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
			style: {
				display: "inline-block",
				flexShrink: 0,
				verticalAlign: "middle",
				...style
			},
			dangerouslySetInnerHTML: { __html: inner },
			...rest
		});
	}
	//#endregion
	//#region components/navigation/Accordion.jsx
	function Accordion({ items = [], defaultOpenValue, style }) {
		const [open, setOpen] = react.default.useState(defaultOpenValue);
		return /* @__PURE__ */ react.default.createElement("div", { style }, items.map((item) => /* @__PURE__ */ react.default.createElement(AccordionItem, {
			key: item.value,
			item,
			isOpen: open === item.value,
			onToggle: () => setOpen(open === item.value ? null : item.value)
		})));
	}
	function AccordionItem({ item, isOpen, onToggle }) {
		const [hover, setHover] = react.default.useState(false);
		return /* @__PURE__ */ react.default.createElement("div", { style: { borderBottom: "1px solid hsl(var(--border))" } }, /* @__PURE__ */ react.default.createElement("div", { style: { display: "flex" } }, /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick: onToggle,
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				display: "flex",
				flex: 1,
				alignItems: "center",
				justifyContent: "space-between",
				gap: 8,
				border: "none",
				background: "transparent",
				padding: "16px 0",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				fontWeight: "var(--font-weight-medium)",
				color: "inherit",
				cursor: "pointer",
				textAlign: "left",
				textDecoration: hover ? "underline" : "none"
			}
		}, item.title, /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			style: {
				flexShrink: 0,
				transform: isOpen ? "rotate(180deg)" : "none",
				transition: "transform var(--duration) var(--ease-out)"
			}
		}, /* @__PURE__ */ react.default.createElement("path", { d: "m6 9 6 6 6-6" })))), isOpen ? /* @__PURE__ */ react.default.createElement("div", { style: {
			overflow: "hidden",
			fontSize: "var(--text-sm)",
			lineHeight: "var(--leading-sm)"
		} }, /* @__PURE__ */ react.default.createElement("div", { style: { paddingBottom: 16 } }, item.content)) : null);
	}
	//#endregion
	//#region components/navigation/Collapsible.jsx
	function Collapsible({ trigger, defaultOpen = false, open: openProp, onOpenChange, children, style }) {
		const [internal, setInternal] = react.default.useState(defaultOpen);
		const open = openProp !== void 0 ? openProp : internal;
		const toggle = () => {
			if (openProp === void 0) setInternal(!open);
			onOpenChange && onOpenChange(!open);
		};
		return /* @__PURE__ */ react.default.createElement("div", { style }, /* @__PURE__ */ react.default.createElement("div", {
			onClick: toggle,
			style: { cursor: "pointer" }
		}, typeof trigger === "function" ? trigger(open) : trigger), open ? /* @__PURE__ */ react.default.createElement("div", null, children) : null);
	}
	//#endregion
	//#region components/navigation/NavigationMenu.jsx
	function NavigationMenu({ items = [], activeValue, onSelect, style }) {
		return /* @__PURE__ */ react.default.createElement("nav", { style: {
			position: "relative",
			zIndex: 10,
			display: "flex",
			maxWidth: "max-content",
			alignItems: "center",
			justifyContent: "center",
			gap: 4,
			...style
		} }, items.map((item) => /* @__PURE__ */ react.default.createElement(NavigationMenuItem, {
			key: item.value,
			item,
			active: item.value === activeValue,
			onSelect
		})));
	}
	function NavigationMenuItem({ item, active, onSelect }) {
		const [hover, setHover] = react.default.useState(false);
		const background = hover ? "hsl(var(--accent))" : active ? "hsl(var(--accent) / 0.5)" : "hsl(var(--background))";
		return /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick: () => onSelect && onSelect(item.value),
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				gap: 8,
				height: 40,
				width: "max-content",
				padding: "8px 16px",
				borderRadius: "var(--radius-md)",
				border: "none",
				cursor: "pointer",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				fontWeight: "var(--font-weight-medium)",
				background,
				color: hover ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
				transition: "var(--transition-colors)"
			}
		}, item.icon, item.label, item.submenu ? /* @__PURE__ */ react.default.createElement("svg", {
			width: "12",
			height: "12",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			style: {
				position: "relative",
				top: 1,
				marginLeft: 4
			}
		}, /* @__PURE__ */ react.default.createElement("path", { d: "m6 9 6 6 6-6" })) : null);
	}
	//#endregion
	//#region components/navigation/ScrollArea.jsx
	function ScrollArea({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			className: "ds-scroll-area",
			style: {
				position: "relative",
				overflow: "auto",
				...style
			},
			...rest
		}, /* @__PURE__ */ react.default.createElement("style", null, ".ds-scroll-area{scrollbar-width:thin;scrollbar-color:hsl(var(--border)) transparent}.ds-scroll-area::-webkit-scrollbar{width:10px;height:10px}.ds-scroll-area::-webkit-scrollbar-track{background:transparent}.ds-scroll-area::-webkit-scrollbar-thumb{background:hsl(var(--border));border-radius:9999px;border:1px solid transparent;background-clip:padding-box}"), children);
	}
	//#endregion
	//#region components/navigation/Sidebar.jsx
	function Sidebar({ collapsed = false, style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			"data-state": collapsed ? "collapsed" : "expanded",
			style: {
				display: "flex",
				flexDirection: "column",
				height: "100%",
				width: collapsed ? "var(--sidebar-width-icon)" : "var(--sidebar-width)",
				flexShrink: 0,
				background: "hsl(var(--sidebar-background))",
				color: "hsl(var(--sidebar-foreground))",
				borderRight: "1px solid hsl(var(--sidebar-border))",
				transition: "var(--sidebar-transition)",
				overflow: "hidden",
				...style
			},
			...rest
		}, children);
	}
	function SidebarHeader({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				height: 48,
				padding: "0 8px",
				...style
			},
			...rest
		}, children);
	}
	function SidebarContent({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				minHeight: 0,
				flex: 1,
				flexDirection: "column",
				gap: 8,
				overflowY: "auto",
				paddingTop: 8,
				...style
			},
			...rest
		}, children);
	}
	function SidebarFooter({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 8,
				padding: 8,
				...style
			},
			...rest
		}, children);
	}
	function SidebarGroup({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				position: "relative",
				display: "flex",
				width: "100%",
				minWidth: 0,
				flexDirection: "column",
				padding: 8,
				...style
			},
			...rest
		}, children);
	}
	function SidebarGroupLabel({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				height: 32,
				alignItems: "center",
				borderRadius: "var(--radius-md)",
				padding: "0 8px",
				fontSize: "var(--text-xs)",
				fontWeight: "var(--font-weight-medium)",
				color: "hsl(var(--sidebar-foreground) / 0.7)",
				...style
			},
			...rest
		}, children);
	}
	function SidebarMenu({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("ul", {
			style: {
				listStyle: "none",
				margin: 0,
				padding: 0,
				display: "flex",
				width: "100%",
				minWidth: 0,
				flexDirection: "column",
				gap: 6,
				...style
			},
			...rest
		}, children);
	}
	function SidebarMenuItem({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("li", {
			style: {
				position: "relative",
				...style
			},
			...rest
		}, children);
	}
	function SidebarMenuButton({ size = "default", isActive = false, icon, trailing, style, children, ...rest }) {
		const [hover, setHover] = react.default.useState(false);
		const heights = {
			sm: 28,
			default: 32,
			lg: 48
		};
		const on = hover || isActive;
		return /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			"data-active": isActive,
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				display: "flex",
				width: "100%",
				alignItems: "center",
				gap: 8,
				overflow: "hidden",
				borderRadius: "var(--radius-md)",
				border: "none",
				padding: 8,
				textAlign: "left",
				height: heights[size] || heights.default,
				fontFamily: "var(--font-sans)",
				fontSize: size === "sm" ? "var(--text-xs)" : "var(--text-sm)",
				fontWeight: isActive ? "var(--font-weight-medium)" : "var(--font-weight-normal)",
				background: on ? "hsl(var(--sidebar-accent))" : "transparent",
				color: "hsl(var(--sidebar-accent-foreground))",
				cursor: "pointer",
				transition: "var(--transition-colors)",
				...style
			},
			...rest
		}, icon, /* @__PURE__ */ react.default.createElement("span", { style: {
			flex: 1,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		} }, children), trailing);
	}
	function SidebarMenuSub({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("ul", {
			style: {
				listStyle: "none",
				margin: "0 4px",
				padding: "2px 6px",
				display: "flex",
				minWidth: 0,
				flexDirection: "column",
				gap: 4,
				...style
			},
			...rest
		}, children);
	}
	function SidebarMenuSubButton({ icon, depth = 0, style, children, ...rest }) {
		const [hover, setHover] = react.default.useState(false);
		return /* @__PURE__ */ react.default.createElement("a", {
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			style: {
				display: "flex",
				minHeight: depth ? 28 : 32,
				alignItems: "center",
				gap: 8,
				overflow: "hidden",
				borderRadius: "var(--radius-md)",
				padding: depth ? "4px 8px" : "6px 8px",
				fontSize: depth ? "var(--text-xs)" : "var(--text-13)",
				textDecoration: "none",
				color: depth ? "hsl(var(--sidebar-foreground) / 0.8)" : "hsl(var(--sidebar-foreground))",
				background: hover ? "hsl(var(--sidebar-accent))" : "transparent",
				cursor: "pointer",
				transition: "var(--transition-colors)",
				...style
			},
			...rest
		}, icon, /* @__PURE__ */ react.default.createElement("span", { style: { flex: 1 } }, children));
	}
	//#endregion
	//#region components/navigation/Tabs.jsx
	function Tabs({ tabs = [], value, defaultValue, onValueChange, style, children }) {
		const [internal, setInternal] = react.default.useState(defaultValue || tabs[0] && tabs[0].value);
		const current = value !== void 0 ? value : internal;
		const set = (v) => {
			if (value === void 0) setInternal(v);
			onValueChange && onValueChange(v);
		};
		return /* @__PURE__ */ react.default.createElement("div", { style }, /* @__PURE__ */ react.default.createElement("div", {
			role: "tablist",
			style: {
				display: "inline-flex",
				height: 40,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: "var(--radius-md)",
				background: "hsl(var(--muted))",
				padding: 4,
				color: "hsl(var(--muted-foreground))"
			}
		}, tabs.map((t) => {
			const active = t.value === current;
			return /* @__PURE__ */ react.default.createElement("button", {
				key: t.value,
				role: "tab",
				"aria-selected": active,
				type: "button",
				onClick: () => set(t.value),
				style: {
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					whiteSpace: "nowrap",
					borderRadius: "var(--radius-sm)",
					border: "none",
					padding: "6px 12px",
					fontFamily: "var(--font-sans)",
					fontSize: "var(--text-sm)",
					fontWeight: "var(--font-weight-medium)",
					background: active ? "hsl(var(--background))" : "transparent",
					color: active ? "hsl(var(--foreground))" : "inherit",
					boxShadow: active ? "var(--shadow-sm)" : "none",
					cursor: "pointer",
					transition: "var(--transition-colors)"
				}
			}, t.label);
		})), children ? /* @__PURE__ */ react.default.createElement("div", { style: { marginTop: 8 } }, children) : null);
	}
	//#endregion
	//#region components/overlays/AlertDialog.jsx
	function AlertDialog({ open = true, title, description, confirmLabel = "Ok", cancelLabel = "Cancel", onConfirm, onCancel, destructive = false, style }) {
		if (!open) return null;
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "absolute",
			inset: 0,
			zIndex: 50,
			...style
		} }, /* @__PURE__ */ react.default.createElement("div", {
			onClick: onCancel,
			style: {
				position: "absolute",
				inset: 0,
				background: "var(--overlay-scrim)"
			}
		}), /* @__PURE__ */ react.default.createElement("div", {
			role: "alertdialog",
			style: {
				position: "absolute",
				left: "50%",
				top: "50%",
				transform: "translate(-50%,-50%)",
				display: "grid",
				gap: 16,
				width: "100%",
				maxWidth: 512,
				boxSizing: "border-box",
				border: "1px solid hsl(var(--border))",
				borderRadius: "var(--radius-lg)",
				background: "hsl(var(--background))",
				padding: 24,
				boxShadow: "var(--shadow-lg)"
			}
		}, /* @__PURE__ */ react.default.createElement("div", { style: {
			display: "flex",
			flexDirection: "column",
			gap: 8
		} }, /* @__PURE__ */ react.default.createElement("h2", { style: {
			margin: 0,
			fontSize: "var(--text-lg)",
			fontWeight: "var(--font-weight-semibold)",
			color: "hsl(var(--foreground))"
		} }, title), /* @__PURE__ */ react.default.createElement("p", { style: {
			margin: 0,
			fontSize: "var(--text-sm)",
			color: "hsl(var(--muted-foreground))"
		} }, description)), /* @__PURE__ */ react.default.createElement("div", { style: {
			display: "flex",
			justifyContent: "flex-end",
			gap: 8
		} }, /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick: onCancel,
			style: {
				height: 40,
				padding: "8px 16px",
				borderRadius: "var(--radius-md)",
				border: "1px solid hsl(var(--input))",
				background: "hsl(var(--background))",
				color: "hsl(var(--muted-foreground))",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				fontWeight: "var(--font-weight-medium)",
				cursor: "pointer"
			}
		}, cancelLabel), /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick: onConfirm,
			style: {
				height: 40,
				padding: "8px 16px",
				borderRadius: "var(--radius-md)",
				border: "1px solid transparent",
				background: destructive ? "hsl(var(--destructive))" : "hsl(var(--primary))",
				color: destructive ? "hsl(var(--destructive-foreground))" : "hsl(var(--primary-foreground))",
				fontFamily: "var(--font-sans)",
				fontSize: "var(--text-sm)",
				fontWeight: "var(--font-weight-medium)",
				cursor: "pointer"
			}
		}, confirmLabel))));
	}
	//#endregion
	//#region components/overlays/ConfirmationPopover.jsx
	function ConfirmationPopover({ open = true, title, prompt, onConfirm, onCancel, style }) {
		return /* @__PURE__ */ react.default.createElement(AlertDialog, {
			open,
			title,
			description: prompt,
			cancelLabel: "Cancel",
			confirmLabel: "Ok",
			onConfirm,
			onCancel,
			style
		});
	}
	//#endregion
	//#region components/overlays/Dialog.jsx
	function Dialog({ open = true, onOpenChange, children, style }) {
		if (!open) return null;
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "absolute",
			inset: 0,
			zIndex: 50,
			...style
		} }, /* @__PURE__ */ react.default.createElement("div", {
			onClick: () => onOpenChange && onOpenChange(false),
			style: {
				position: "absolute",
				inset: 0,
				background: "var(--overlay-scrim)"
			}
		}), /* @__PURE__ */ react.default.createElement("div", {
			role: "dialog",
			style: {
				position: "absolute",
				left: "50%",
				top: "50%",
				transform: "translate(-50%,-50%)",
				display: "grid",
				gap: 16,
				width: "100%",
				maxWidth: 512,
				boxSizing: "border-box",
				border: "1px solid hsl(var(--border))",
				borderRadius: "var(--radius-lg)",
				background: "hsl(var(--background))",
				padding: 24,
				boxShadow: "var(--shadow-lg)"
			}
		}, children, /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick: () => onOpenChange && onOpenChange(false),
			"aria-label": "Close",
			style: {
				position: "absolute",
				right: 16,
				top: 16,
				border: "none",
				background: "transparent",
				opacity: .7,
				cursor: "pointer",
				padding: 0,
				color: "inherit"
			}
		}, /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round"
		}, /* @__PURE__ */ react.default.createElement("path", { d: "M18 6 6 18M6 6l12 12" })))));
	}
	function DialogHeader({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 6,
				color: "hsl(var(--foreground))",
				...style
			},
			...rest
		}, children);
	}
	function DialogTitle({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("h2", {
			style: {
				margin: 0,
				fontSize: "var(--text-lg)",
				fontWeight: "var(--font-weight-semibold)",
				lineHeight: 1,
				letterSpacing: "var(--tracking-tight)",
				...style
			},
			...rest
		}, children);
	}
	function DialogDescription({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("p", {
			style: {
				margin: 0,
				fontSize: "var(--text-sm)",
				color: "hsl(var(--muted-foreground))",
				...style
			},
			...rest
		}, children);
	}
	function DialogFooter({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				justifyContent: "flex-end",
				gap: 8,
				...style
			},
			...rest
		}, children);
	}
	//#endregion
	//#region components/overlays/DropdownMenu.jsx
	function DropdownMenu({ trigger, items = [], align = "start", side = "bottom", label, minWidth = 224, defaultOpen = false, onSelect, style }) {
		const [open, setOpen] = react.default.useState(defaultOpen);
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "relative",
			display: "inline-block",
			...style
		} }, /* @__PURE__ */ react.default.createElement("span", {
			onClick: () => setOpen(!open),
			style: { display: "inline-flex" }
		}, trigger), open ? /* @__PURE__ */ react.default.createElement("div", {
			role: "menu",
			style: {
				position: "absolute",
				zIndex: 50,
				minWidth,
				top: side === "bottom" ? "calc(100% + 4px)" : 0,
				left: side === "right" ? "calc(100% + 4px)" : align === "start" ? 0 : void 0,
				right: align === "end" && side !== "right" ? 0 : void 0,
				overflow: "hidden",
				borderRadius: "var(--radius-md)",
				border: "1px solid hsl(var(--border))",
				background: "hsl(var(--popover))",
				color: "hsl(var(--popover-foreground))",
				padding: 4,
				boxShadow: "var(--shadow-md)"
			}
		}, label ? /* @__PURE__ */ react.default.createElement("div", { style: {
			padding: "6px 8px",
			fontSize: "var(--text-sm)",
			fontWeight: "var(--font-weight-semibold)"
		} }, label) : null, items.map((item, i) => item.separator ? /* @__PURE__ */ react.default.createElement("div", {
			key: "sep" + i,
			style: {
				margin: "4px -4px",
				height: 1,
				background: "hsl(var(--muted))"
			}
		}) : /* @__PURE__ */ react.default.createElement(DropdownMenuItem, {
			key: item.value || item.label,
			item,
			onSelect: (v) => {
				setOpen(false);
				onSelect && onSelect(v);
			}
		}))) : null);
	}
	function DropdownMenuItem({ item, onSelect }) {
		const [hover, setHover] = react.default.useState(false);
		const disabled = !!item.disabled;
		return /* @__PURE__ */ react.default.createElement("div", {
			role: "menuitem",
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
			onClick: () => !disabled && onSelect && onSelect(item.value || item.label),
			style: {
				position: "relative",
				display: "flex",
				alignItems: "center",
				gap: 8,
				borderRadius: "var(--radius-sm)",
				padding: "6px 8px",
				fontSize: "var(--text-sm)",
				cursor: "default",
				userSelect: "none",
				opacity: disabled ? .5 : 1,
				background: hover && !disabled ? "hsl(var(--accent))" : "transparent",
				color: hover && !disabled ? "hsl(var(--accent-foreground))" : "inherit"
			}
		}, item.checked ? /* @__PURE__ */ react.default.createElement("svg", {
			width: "14",
			height: "14",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round"
		}, /* @__PURE__ */ react.default.createElement("path", { d: "M20 6 9 17l-5-5" })) : null, item.icon ? /* @__PURE__ */ react.default.createElement("span", { style: { display: "inline-flex" } }, item.icon) : null, /* @__PURE__ */ react.default.createElement("span", { style: {
			flex: 1,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		} }, item.label), item.badge ? /* @__PURE__ */ react.default.createElement("span", { style: {
			borderRadius: "var(--radius-sm)",
			background: "hsl(var(--muted))",
			padding: "2px 6px",
			fontSize: "var(--text-2xs)",
			fontWeight: "var(--font-weight-medium)",
			color: "hsl(var(--muted-foreground))"
		} }, item.badge) : null, item.submenu ? /* @__PURE__ */ react.default.createElement("svg", {
			width: "14",
			height: "14",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round"
		}, /* @__PURE__ */ react.default.createElement("path", { d: "m9 18 6-6-6-6" })) : null, item.shortcut ? /* @__PURE__ */ react.default.createElement("span", { style: {
			marginLeft: "auto",
			fontSize: "var(--text-xs)",
			letterSpacing: "var(--tracking-widest)",
			opacity: .6
		} }, item.shortcut) : null);
	}
	//#endregion
	//#region components/overlays/Popover.jsx
	function Popover({ trigger, children, align = "center", width = 288, defaultOpen = false, style }) {
		const [open, setOpen] = react.default.useState(defaultOpen);
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "relative",
			display: "inline-block",
			...style
		} }, /* @__PURE__ */ react.default.createElement("span", {
			onClick: () => setOpen(!open),
			style: { display: "inline-flex" }
		}, trigger), open ? /* @__PURE__ */ react.default.createElement("div", {
			role: "dialog",
			style: {
				position: "absolute",
				zIndex: 50,
				top: "calc(100% + 4px)",
				left: align === "start" ? 0 : align === "center" ? "50%" : void 0,
				right: align === "end" ? 0 : void 0,
				transform: align === "center" ? "translateX(-50%)" : void 0,
				width,
				boxSizing: "border-box",
				borderRadius: "var(--radius-md)",
				border: "1px solid hsl(var(--border))",
				background: "hsl(var(--popover))",
				color: "hsl(var(--popover-foreground))",
				padding: 16,
				boxShadow: "var(--shadow-md)"
			}
		}, children) : null);
	}
	//#endregion
	//#region components/overlays/Sheet.jsx
	function Sheet({ open = true, side = "right", width = 384, onOpenChange, children, style }) {
		if (!open) return null;
		const horizontal = side === "left" || side === "right";
		return /* @__PURE__ */ react.default.createElement("div", { style: {
			position: "absolute",
			inset: 0,
			zIndex: 50,
			...style
		} }, /* @__PURE__ */ react.default.createElement("div", {
			onClick: () => onOpenChange && onOpenChange(false),
			style: {
				position: "absolute",
				inset: 0,
				background: "var(--overlay-scrim)"
			}
		}), /* @__PURE__ */ react.default.createElement("div", {
			role: "dialog",
			style: {
				position: "absolute",
				top: side === "bottom" ? void 0 : 0,
				bottom: side === "top" ? void 0 : 0,
				left: side === "right" ? void 0 : 0,
				right: side === "left" ? void 0 : 0,
				width: horizontal ? Math.min(width, 384) : "100%",
				maxWidth: horizontal ? 384 : void 0,
				height: horizontal ? "100%" : void 0,
				display: "flex",
				flexDirection: "column",
				gap: 16,
				boxSizing: "border-box",
				background: "hsl(var(--background))",
				padding: 24,
				boxShadow: "var(--shadow-lg)",
				borderLeft: side === "right" ? "1px solid hsl(var(--border))" : void 0,
				borderRight: side === "left" ? "1px solid hsl(var(--border))" : void 0,
				borderTop: side === "bottom" ? "1px solid hsl(var(--border))" : void 0,
				borderBottom: side === "top" ? "1px solid hsl(var(--border))" : void 0
			}
		}, children, /* @__PURE__ */ react.default.createElement("button", {
			type: "button",
			onClick: () => onOpenChange && onOpenChange(false),
			"aria-label": "Close",
			style: {
				position: "absolute",
				right: 16,
				top: 16,
				border: "none",
				background: "transparent",
				borderRadius: "var(--radius-sm)",
				opacity: .7,
				cursor: "pointer",
				padding: 0,
				color: "inherit"
			}
		}, /* @__PURE__ */ react.default.createElement("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round"
		}, /* @__PURE__ */ react.default.createElement("path", { d: "M18 6 6 18M6 6l12 12" })))));
	}
	function SheetHeader({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 8,
				...style
			},
			...rest
		}, children);
	}
	function SheetTitle({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("h2", {
			style: {
				margin: 0,
				fontSize: "var(--text-lg)",
				fontWeight: "var(--font-weight-semibold)",
				color: "hsl(var(--foreground))",
				...style
			},
			...rest
		}, children);
	}
	function SheetDescription({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("p", {
			style: {
				margin: 0,
				fontSize: "var(--text-sm)",
				color: "hsl(var(--muted-foreground))",
				...style
			},
			...rest
		}, children);
	}
	function SheetFooter({ style, children, ...rest }) {
		return /* @__PURE__ */ react.default.createElement("div", {
			style: {
				display: "flex",
				justifyContent: "flex-end",
				gap: 8,
				...style
			},
			...rest
		}, children);
	}
	//#endregion
	//#region components/overlays/Tooltip.jsx
	function Tooltip({ content, side = "top", children, style }) {
		const [open, setOpen] = react.default.useState(false);
		const pos = side === "right" ? {
			left: "calc(100% + 8px)",
			top: "50%",
			transform: "translateY(-50%)"
		} : side === "bottom" ? {
			top: "calc(100% + 8px)",
			left: "50%",
			transform: "translateX(-50%)"
		} : {
			bottom: "calc(100% + 8px)",
			left: "50%",
			transform: "translateX(-50%)"
		};
		return /* @__PURE__ */ react.default.createElement("span", {
			style: {
				position: "relative",
				display: "inline-flex",
				...style
			},
			onMouseEnter: () => setOpen(true),
			onMouseLeave: () => setOpen(false)
		}, children, open ? /* @__PURE__ */ react.default.createElement("span", {
			role: "tooltip",
			style: {
				position: "absolute",
				zIndex: 50,
				whiteSpace: "nowrap",
				overflow: "hidden",
				borderRadius: "var(--radius-md)",
				border: "1px solid hsl(var(--border))",
				background: "hsl(var(--popover))",
				color: "hsl(var(--popover-foreground))",
				padding: "6px 12px",
				fontSize: "var(--text-sm)",
				boxShadow: "var(--shadow-md)",
				...pos
			}
		}, content) : null);
	}
	//#endregion
	exports.Accordion = Accordion;
	exports.AlertDialog = AlertDialog;
	exports.Badge = Badge;
	exports.Button = Button;
	exports.Calendar = Calendar;
	exports.Card = Card;
	exports.CardContent = CardContent;
	exports.CardDescription = CardDescription;
	exports.CardFooter = CardFooter;
	exports.CardHeader = CardHeader;
	exports.CardTitle = CardTitle;
	exports.Checkbox = Checkbox;
	exports.Collapsible = Collapsible;
	exports.Command = Command;
	exports.CommandItem = CommandItem;
	exports.ConfirmationPopover = ConfirmationPopover;
	exports.DatePicker = DatePicker;
	exports.Dialog = Dialog;
	exports.DialogDescription = DialogDescription;
	exports.DialogFooter = DialogFooter;
	exports.DialogHeader = DialogHeader;
	exports.DialogTitle = DialogTitle;
	exports.DropdownMenu = DropdownMenu;
	exports.DropdownMenuItem = DropdownMenuItem;
	exports.Form = Form;
	exports.FormControl = FormControl;
	exports.FormDescription = FormDescription;
	exports.FormItem = FormItem;
	exports.FormLabel = FormLabel;
	exports.FormMessage = FormMessage;
	exports.Icon = Icon;
	exports.Input = Input;
	exports.Label = Label;
	exports.Link = Link;
	exports.MultiSelect = MultiSelect;
	exports.NavigationMenu = NavigationMenu;
	exports.NavigationMenuItem = NavigationMenuItem;
	exports.Popover = Popover;
	exports.Progress = Progress;
	exports.RadioGroup = RadioGroup;
	exports.RadioGroupItem = RadioGroupItem;
	exports.ScrollArea = ScrollArea;
	exports.Select = Select;
	exports.SelectItem = SelectItem;
	exports.Separator = Separator;
	exports.Sheet = Sheet;
	exports.SheetDescription = SheetDescription;
	exports.SheetFooter = SheetFooter;
	exports.SheetHeader = SheetHeader;
	exports.SheetTitle = SheetTitle;
	exports.Sidebar = Sidebar;
	exports.SidebarContent = SidebarContent;
	exports.SidebarFooter = SidebarFooter;
	exports.SidebarGroup = SidebarGroup;
	exports.SidebarGroupLabel = SidebarGroupLabel;
	exports.SidebarHeader = SidebarHeader;
	exports.SidebarMenu = SidebarMenu;
	exports.SidebarMenuButton = SidebarMenuButton;
	exports.SidebarMenuItem = SidebarMenuItem;
	exports.SidebarMenuSub = SidebarMenuSub;
	exports.SidebarMenuSubButton = SidebarMenuSubButton;
	exports.Skeleton = Skeleton;
	exports.Switch = Switch;
	exports.Table = Table;
	exports.TableBody = TableBody;
	exports.TableCaption = TableCaption;
	exports.TableCell = TableCell;
	exports.TableFooter = TableFooter;
	exports.TableHead = TableHead;
	exports.TableHeader = TableHeader;
	exports.TableRow = TableRow;
	exports.Tabs = Tabs;
	exports.Textarea = Textarea;
	exports.Tooltip = Tooltip;
	return exports;
})({}, Object.assign({ default: React }, React));
