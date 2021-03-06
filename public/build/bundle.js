
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Logos.svelte generated by Svelte v3.38.2 */

    const file$a = "src/Logos.svelte";

    function create_fragment$a(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let div0;
    	let span0;
    	let t1;
    	let img0;
    	let img0_src_value;
    	let t2;
    	let div1;
    	let span1;
    	let t4;
    	let img1;
    	let img1_src_value;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "PRIMARY LOGO";
    			t1 = space();
    			img0 = element("img");
    			t2 = space();
    			div1 = element("div");
    			span1 = element("span");
    			span1.textContent = "SECONDARY LOGO";
    			t4 = space();
    			img1 = element("img");
    			attr_dev(span0, "class", "title-section");
    			add_location(span0, file$a, 11, 16, 431);
    			if (img0.src !== (img0_src_value = /*firstLogoUrl*/ ctx[0])) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "logo");
    			add_location(img0, file$a, 12, 16, 495);
    			attr_dev(div0, "class", "style-guide__logos__first");
    			add_location(div0, file$a, 10, 12, 375);
    			attr_dev(span1, "class", "title-section");
    			add_location(span1, file$a, 15, 16, 621);
    			if (img1.src !== (img1_src_value = /*secondLogoUrl*/ ctx[1])) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "logo2");
    			add_location(img1, file$a, 16, 16, 687);
    			attr_dev(div1, "class", "style-guide__logos__second");
    			add_location(div1, file$a, 14, 12, 564);
    			attr_dev(div2, "class", "style-guide__logos__container");
    			add_location(div2, file$a, 9, 8, 319);
    			attr_dev(div3, "class", "style-guide__logos");
    			add_location(div3, file$a, 8, 4, 278);
    			attr_dev(div4, "class", "style-guide__row border-bottom");
    			add_location(div4, file$a, 7, 0, 229);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t1);
    			append_dev(div0, img0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, span1);
    			append_dev(div1, t4);
    			append_dev(div1, img1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Logos", slots, []);
    	let firstLogoUrl = "https://juancamejoalarcon.s3.eu-west-3.amazonaws.com/logo-v2.svg";
    	let secondLogoUrl = "https://juancamejoalarcon.s3.eu-west-3.amazonaws.com/logo-alternate-v2.svg";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Logos> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ firstLogoUrl, secondLogoUrl });

    	$$self.$inject_state = $$props => {
    		if ("firstLogoUrl" in $$props) $$invalidate(0, firstLogoUrl = $$props.firstLogoUrl);
    		if ("secondLogoUrl" in $$props) $$invalidate(1, secondLogoUrl = $$props.secondLogoUrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [firstLogoUrl, secondLogoUrl];
    }

    class Logos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logos",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/Colors.svelte generated by Svelte v3.38.2 */

    const file$9 = "src/Colors.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (15:12) {#each colors as color}
    function create_each_block(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = /*color*/ ctx[1].rgb + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*color*/ ctx[1].hex + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span0 = element("span");
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(div0, "class", "style-guide__colors__color__rect");
    			attr_dev(div0, "style", `background-color: ${/*color*/ ctx[1].hex};`);
    			add_location(div0, file$9, 16, 20, 687);
    			attr_dev(span0, "class", "style-guide__colors__color__title");
    			add_location(span0, file$9, 17, 20, 799);
    			attr_dev(span1, "class", "style-guide__colors__color__ref");
    			add_location(span1, file$9, 18, 20, 875);
    			attr_dev(span2, "class", "style-guide__colors__color__ref");
    			add_location(span2, file$9, 19, 20, 960);
    			attr_dev(div1, "class", "style-guide__colors__color");
    			add_location(div1, file$9, 15, 16, 626);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			append_dev(div1, span0);
    			append_dev(div1, t1);
    			append_dev(div1, span1);
    			append_dev(span1, t2);
    			append_dev(div1, t3);
    			append_dev(div1, span2);
    			append_dev(span2, t4);
    			append_dev(div1, t5);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(15:12) {#each colors as color}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let span;
    	let t1;
    	let each_value = /*colors*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			span.textContent = "COLORS";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(span, "class", "title-section");
    			add_location(span, file$9, 13, 12, 532);
    			attr_dev(div0, "class", "style-guide__colors__container");
    			add_location(div0, file$9, 12, 8, 475);
    			attr_dev(div1, "class", "style-guide__colors");
    			add_location(div1, file$9, 11, 4, 433);
    			attr_dev(div2, "class", "style-guide__row border-bottom");
    			add_location(div2, file$9, 10, 0, 384);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			append_dev(div0, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*colors*/ 1) {
    				each_value = /*colors*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Colors", slots, []);

    	let colors = [
    		{
    			title: "primary",
    			rgb: "110,65,255",
    			hex: "#6e41ff"
    		},
    		{
    			title: "secondary",
    			rgb: "245,249,254",
    			hex: "#f5f9fe"
    		},
    		{
    			title: "primary-b",
    			rgb: "208,208,208",
    			hex: "#d0d0d0"
    		},
    		{
    			title: "secondary-c",
    			rgb: "51,51,51",
    			hex: "#333333"
    		},
    		{
    			title: "secondary-b",
    			rgb: "102,102,102",
    			hex: "#666666"
    		}
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Colors> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ colors });

    	$$self.$inject_state = $$props => {
    		if ("colors" in $$props) $$invalidate(0, colors = $$props.colors);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [colors];
    }

    class Colors extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Colors",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/Fonts.svelte generated by Svelte v3.38.2 */

    const file$8 = "src/Fonts.svelte";

    function create_fragment$8(ctx) {
    	let div21;
    	let div20;
    	let div19;
    	let span0;
    	let t1;
    	let div8;
    	let div0;
    	let t3;
    	let div1;
    	let t5;
    	let div3;
    	let div2;
    	let span1;
    	let t7;
    	let span2;
    	let t9;
    	let div5;
    	let div4;
    	let span3;
    	let t11;
    	let span4;
    	let t13;
    	let div7;
    	let div6;
    	let span5;
    	let t15;
    	let span6;
    	let t17;
    	let div17;
    	let div9;
    	let t19;
    	let div10;
    	let t21;
    	let div12;
    	let div11;
    	let span7;
    	let t23;
    	let span8;
    	let t25;
    	let div14;
    	let div13;
    	let span9;
    	let t27;
    	let span10;
    	let t29;
    	let div16;
    	let div15;
    	let span11;
    	let t31;
    	let span12;
    	let t33;
    	let div18;
    	let h1;
    	let t35;
    	let h2;
    	let t37;
    	let h3;
    	let t39;
    	let h4;
    	let t41;
    	let h5;
    	let t43;
    	let h6;

    	const block = {
    		c: function create() {
    			div21 = element("div");
    			div20 = element("div");
    			div19 = element("div");
    			span0 = element("span");
    			span0.textContent = "FONTS";
    			t1 = space();
    			div8 = element("div");
    			div0 = element("div");
    			div0.textContent = "AaBbCc 01234";
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = "Roboto";
    			t5 = space();
    			div3 = element("div");
    			div2 = element("div");
    			span1 = element("span");
    			span1.textContent = "Regular";
    			t7 = space();
    			span2 = element("span");
    			span2.textContent = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad";
    			t9 = space();
    			div5 = element("div");
    			div4 = element("div");
    			span3 = element("span");
    			span3.textContent = "Bold";
    			t11 = space();
    			span4 = element("span");
    			span4.textContent = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad";
    			t13 = space();
    			div7 = element("div");
    			div6 = element("div");
    			span5 = element("span");
    			span5.textContent = "Extrabold";
    			t15 = space();
    			span6 = element("span");
    			span6.textContent = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad";
    			t17 = space();
    			div17 = element("div");
    			div9 = element("div");
    			div9.textContent = "AaBbCc 01234";
    			t19 = space();
    			div10 = element("div");
    			div10.textContent = "Cabin";
    			t21 = space();
    			div12 = element("div");
    			div11 = element("div");
    			span7 = element("span");
    			span7.textContent = "Regular";
    			t23 = space();
    			span8 = element("span");
    			span8.textContent = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad";
    			t25 = space();
    			div14 = element("div");
    			div13 = element("div");
    			span9 = element("span");
    			span9.textContent = "Bold";
    			t27 = space();
    			span10 = element("span");
    			span10.textContent = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad";
    			t29 = space();
    			div16 = element("div");
    			div15 = element("div");
    			span11 = element("span");
    			span11.textContent = "Extrabold";
    			t31 = space();
    			span12 = element("span");
    			span12.textContent = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad";
    			t33 = space();
    			div18 = element("div");
    			h1 = element("h1");
    			h1.textContent = "h1 This is a headline";
    			t35 = space();
    			h2 = element("h2");
    			h2.textContent = "h2 This is another headline";
    			t37 = space();
    			h3 = element("h3");
    			h3.textContent = "h3 This is another headline";
    			t39 = space();
    			h4 = element("h4");
    			h4.textContent = "h4 This is another headline";
    			t41 = space();
    			h5 = element("h5");
    			h5.textContent = "h5 This is another headline";
    			t43 = space();
    			h6 = element("h6");
    			h6.textContent = "h6 This is another headline";
    			attr_dev(span0, "class", "title-section");
    			add_location(span0, file$8, 6, 12, 152);
    			attr_dev(div0, "class", "style-guide__fonts__primary__title");
    			add_location(div0, file$8, 8, 16, 263);
    			attr_dev(div1, "class", "style-guide__fonts__primary__desc");
    			add_location(div1, file$8, 11, 16, 384);
    			add_location(span1, file$8, 16, 24, 667);
    			add_location(span2, file$8, 19, 24, 766);
    			attr_dev(div2, "class", "style-guide__fonts__primary__body-text__paragraph regular");
    			add_location(div2, file$8, 15, 20, 571);
    			attr_dev(div3, "class", "style-guide__fonts__primary__body-text");
    			add_location(div3, file$8, 14, 16, 498);
    			add_location(span3, file$8, 26, 24, 1226);
    			add_location(span4, file$8, 29, 24, 1322);
    			attr_dev(div4, "class", "style-guide__fonts__primary__body-text__paragraph bold");
    			add_location(div4, file$8, 25, 20, 1133);
    			attr_dev(div5, "class", "style-guide__fonts__primary__body-text");
    			add_location(div5, file$8, 24, 16, 1060);
    			add_location(span5, file$8, 36, 24, 1787);
    			add_location(span6, file$8, 39, 24, 1888);
    			attr_dev(div6, "class", "style-guide__fonts__primary__body-text__paragraph extrabold");
    			add_location(div6, file$8, 35, 20, 1689);
    			attr_dev(div7, "class", "style-guide__fonts__primary__body-text");
    			add_location(div7, file$8, 34, 16, 1616);
    			attr_dev(div8, "class", "style-guide__fonts__primary");
    			add_location(div8, file$8, 7, 12, 205);
    			attr_dev(div9, "class", "style-guide__fonts__secondary__title");
    			add_location(div9, file$8, 46, 16, 2257);
    			attr_dev(div10, "class", "style-guide__fonts__secondary__desc");
    			add_location(div10, file$8, 49, 16, 2380);
    			add_location(span7, file$8, 54, 24, 2664);
    			add_location(span8, file$8, 57, 24, 2763);
    			attr_dev(div11, "class", "style-guide__fonts__primary__body-text__paragraph regular");
    			add_location(div11, file$8, 53, 20, 2568);
    			attr_dev(div12, "class", "style-guide__fonts__primary__body-text");
    			add_location(div12, file$8, 52, 16, 2495);
    			add_location(span9, file$8, 64, 24, 3223);
    			add_location(span10, file$8, 67, 24, 3319);
    			attr_dev(div13, "class", "style-guide__fonts__primary__body-text__paragraph bold");
    			add_location(div13, file$8, 63, 20, 3130);
    			attr_dev(div14, "class", "style-guide__fonts__primary__body-text");
    			add_location(div14, file$8, 62, 16, 3057);
    			add_location(span11, file$8, 74, 24, 3784);
    			add_location(span12, file$8, 77, 24, 3885);
    			attr_dev(div15, "class", "style-guide__fonts__primary__body-text__paragraph extrabold");
    			add_location(div15, file$8, 73, 20, 3686);
    			attr_dev(div16, "class", "style-guide__fonts__primary__body-text");
    			add_location(div16, file$8, 72, 16, 3613);
    			attr_dev(div17, "class", "style-guide__fonts__secondary");
    			add_location(div17, file$8, 45, 12, 2197);
    			add_location(h1, file$8, 84, 16, 4254);
    			add_location(h2, file$8, 85, 16, 4301);
    			add_location(h3, file$8, 86, 16, 4354);
    			add_location(h4, file$8, 87, 16, 4407);
    			add_location(h5, file$8, 88, 16, 4460);
    			add_location(h6, file$8, 89, 16, 4513);
    			attr_dev(div18, "class", "style-guide__fonts__headlines");
    			add_location(div18, file$8, 83, 12, 4194);
    			attr_dev(div19, "class", "style-guide__fonts__container");
    			add_location(div19, file$8, 5, 8, 96);
    			attr_dev(div20, "class", "style-guide__fonts");
    			add_location(div20, file$8, 4, 4, 55);
    			attr_dev(div21, "class", "style-guide__row");
    			add_location(div21, file$8, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div21, anchor);
    			append_dev(div21, div20);
    			append_dev(div20, div19);
    			append_dev(div19, span0);
    			append_dev(div19, t1);
    			append_dev(div19, div8);
    			append_dev(div8, div0);
    			append_dev(div8, t3);
    			append_dev(div8, div1);
    			append_dev(div8, t5);
    			append_dev(div8, div3);
    			append_dev(div3, div2);
    			append_dev(div2, span1);
    			append_dev(div2, t7);
    			append_dev(div2, span2);
    			append_dev(div8, t9);
    			append_dev(div8, div5);
    			append_dev(div5, div4);
    			append_dev(div4, span3);
    			append_dev(div4, t11);
    			append_dev(div4, span4);
    			append_dev(div8, t13);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, span5);
    			append_dev(div6, t15);
    			append_dev(div6, span6);
    			append_dev(div19, t17);
    			append_dev(div19, div17);
    			append_dev(div17, div9);
    			append_dev(div17, t19);
    			append_dev(div17, div10);
    			append_dev(div17, t21);
    			append_dev(div17, div12);
    			append_dev(div12, div11);
    			append_dev(div11, span7);
    			append_dev(div11, t23);
    			append_dev(div11, span8);
    			append_dev(div17, t25);
    			append_dev(div17, div14);
    			append_dev(div14, div13);
    			append_dev(div13, span9);
    			append_dev(div13, t27);
    			append_dev(div13, span10);
    			append_dev(div17, t29);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, span11);
    			append_dev(div15, t31);
    			append_dev(div15, span12);
    			append_dev(div19, t33);
    			append_dev(div19, div18);
    			append_dev(div18, h1);
    			append_dev(div18, t35);
    			append_dev(div18, h2);
    			append_dev(div18, t37);
    			append_dev(div18, h3);
    			append_dev(div18, t39);
    			append_dev(div18, h4);
    			append_dev(div18, t41);
    			append_dev(div18, h5);
    			append_dev(div18, t43);
    			append_dev(div18, h6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div21);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Fonts", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Fonts> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Fonts extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Fonts",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/Buttons.svelte generated by Svelte v3.38.2 */

    const file$7 = "src/Buttons.svelte";

    function create_fragment$7(ctx) {
    	let div11;
    	let div10;
    	let div9;
    	let div6;
    	let span0;
    	let t1;
    	let div5;
    	let div0;
    	let button0;
    	let t3;
    	let div1;
    	let button1;
    	let t5;
    	let div2;
    	let button2;
    	let t7;
    	let div3;
    	let button3;
    	let t9;
    	let div4;
    	let button4;
    	let t11;
    	let button5;
    	let t13;
    	let div8;
    	let span1;
    	let t15;
    	let div7;
    	let br;
    	let t16;
    	let ul0;
    	let li0;
    	let a0;
    	let i0;
    	let t17;
    	let li1;
    	let a1;
    	let i1;
    	let t18;
    	let li2;
    	let a2;
    	let i2;
    	let t19;
    	let li3;
    	let a3;
    	let i3;
    	let t20;
    	let ul1;
    	let li4;
    	let a4;
    	let i4;
    	let t21;
    	let li5;
    	let a5;
    	let i5;
    	let t22;
    	let li6;
    	let a6;
    	let i6;
    	let t23;
    	let li7;
    	let a7;
    	let i7;
    	let t24;
    	let ul2;
    	let li8;
    	let a8;
    	let i8;
    	let t25;
    	let li9;
    	let a9;
    	let i9;
    	let t26;
    	let li10;
    	let a10;
    	let i10;
    	let t27;
    	let li11;
    	let a11;
    	let i11;

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			div6 = element("div");
    			span0 = element("span");
    			span0.textContent = "BUTTONS";
    			t1 = space();
    			div5 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Default";
    			t3 = space();
    			div1 = element("div");
    			button1 = element("button");
    			button1.textContent = "Active";
    			t5 = space();
    			div2 = element("div");
    			button2 = element("button");
    			button2.textContent = "Disabled";
    			t7 = space();
    			div3 = element("div");
    			button3 = element("button");
    			button3.textContent = "Secondary";
    			t9 = space();
    			div4 = element("div");
    			button4 = element("button");
    			button4.textContent = "Medium";
    			t11 = space();
    			button5 = element("button");
    			button5.textContent = "Small";
    			t13 = space();
    			div8 = element("div");
    			span1 = element("span");
    			span1.textContent = "SOCIAL ICONS";
    			t15 = space();
    			div7 = element("div");
    			br = element("br");
    			t16 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			i0 = element("i");
    			t17 = space();
    			li1 = element("li");
    			a1 = element("a");
    			i1 = element("i");
    			t18 = space();
    			li2 = element("li");
    			a2 = element("a");
    			i2 = element("i");
    			t19 = space();
    			li3 = element("li");
    			a3 = element("a");
    			i3 = element("i");
    			t20 = space();
    			ul1 = element("ul");
    			li4 = element("li");
    			a4 = element("a");
    			i4 = element("i");
    			t21 = space();
    			li5 = element("li");
    			a5 = element("a");
    			i5 = element("i");
    			t22 = space();
    			li6 = element("li");
    			a6 = element("a");
    			i6 = element("i");
    			t23 = space();
    			li7 = element("li");
    			a7 = element("a");
    			i7 = element("i");
    			t24 = space();
    			ul2 = element("ul");
    			li8 = element("li");
    			a8 = element("a");
    			i8 = element("i");
    			t25 = space();
    			li9 = element("li");
    			a9 = element("a");
    			i9 = element("i");
    			t26 = space();
    			li10 = element("li");
    			a10 = element("a");
    			i10 = element("i");
    			t27 = space();
    			li11 = element("li");
    			a11 = element("a");
    			i11 = element("i");
    			attr_dev(span0, "class", "title-section");
    			add_location(span0, file$7, 7, 16, 258);
    			attr_dev(button0, "class", "jca-button");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$7, 10, 24, 432);
    			attr_dev(div0, "class", "m-lg");
    			add_location(div0, file$7, 9, 20, 389);
    			attr_dev(button1, "class", "jca-button active");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$7, 15, 24, 634);
    			attr_dev(div1, "class", "m-lg");
    			add_location(div1, file$7, 14, 20, 591);
    			attr_dev(button2, "class", "jca-button disabled");
    			attr_dev(button2, "type", "button");
    			add_location(button2, file$7, 20, 24, 842);
    			attr_dev(div2, "class", "m-lg");
    			add_location(div2, file$7, 19, 20, 799);
    			attr_dev(button3, "class", "jca-button secondary");
    			attr_dev(button3, "type", "button");
    			add_location(button3, file$7, 25, 24, 1054);
    			attr_dev(div3, "class", "m-lg");
    			add_location(div3, file$7, 24, 20, 1011);
    			attr_dev(button4, "class", "jca-button medium");
    			attr_dev(button4, "type", "button");
    			add_location(button4, file$7, 30, 24, 1268);
    			attr_dev(button5, "class", "jca-button small");
    			attr_dev(button5, "type", "button");
    			add_location(button5, file$7, 33, 24, 1410);
    			attr_dev(div4, "class", "m-lg");
    			add_location(div4, file$7, 29, 20, 1225);
    			attr_dev(div5, "class", "style-guide__buttons__left__container");
    			add_location(div5, file$7, 8, 16, 317);
    			attr_dev(div6, "class", "style-guide__buttons__left border-right");
    			add_location(div6, file$7, 6, 12, 188);
    			attr_dev(span1, "class", "title-section");
    			add_location(span1, file$7, 42, 16, 1744);
    			add_location(br, file$7, 44, 20, 1881);
    			attr_dev(i0, "class", "fa fa-instagram");
    			add_location(i0, file$7, 49, 33, 2064);
    			attr_dev(a0, "href", "https://www.instagram.com/");
    			add_location(a0, file$7, 48, 28, 1994);
    			add_location(li0, file$7, 47, 24, 1961);
    			attr_dev(i1, "class", "fa fa-twitter");
    			add_location(i1, file$7, 54, 33, 2278);
    			attr_dev(a1, "href", "https://twitter.com/");
    			add_location(a1, file$7, 53, 28, 2214);
    			add_location(li1, file$7, 52, 24, 2181);
    			attr_dev(i2, "class", "fa fa-linkedin");
    			add_location(i2, file$7, 59, 33, 2495);
    			attr_dev(a2, "href", "https://www.linkedin.com/");
    			add_location(a2, file$7, 58, 28, 2426);
    			add_location(li2, file$7, 57, 24, 2393);
    			attr_dev(i3, "class", "fa fa-github");
    			add_location(i3, file$7, 64, 33, 2707);
    			attr_dev(a3, "href", "https://github.com/");
    			add_location(a3, file$7, 63, 28, 2644);
    			add_location(li3, file$7, 62, 24, 2611);
    			attr_dev(ul0, "class", "jca-social-icons");
    			add_location(ul0, file$7, 46, 20, 1907);
    			attr_dev(i4, "class", "fa fa-instagram");
    			add_location(i4, file$7, 71, 33, 3013);
    			attr_dev(a4, "href", "https://www.instagram.com/");
    			add_location(a4, file$7, 70, 28, 2943);
    			add_location(li4, file$7, 69, 24, 2910);
    			attr_dev(i5, "class", "fa fa-twitter");
    			add_location(i5, file$7, 76, 33, 3227);
    			attr_dev(a5, "href", "https://twitter.com/");
    			add_location(a5, file$7, 75, 28, 3163);
    			add_location(li5, file$7, 74, 24, 3130);
    			attr_dev(i6, "class", "fa fa-linkedin");
    			add_location(i6, file$7, 81, 33, 3444);
    			attr_dev(a6, "href", "https://www.linkedin.com/");
    			add_location(a6, file$7, 80, 28, 3375);
    			add_location(li6, file$7, 79, 24, 3342);
    			attr_dev(i7, "class", "fa fa-github");
    			add_location(i7, file$7, 86, 33, 3656);
    			attr_dev(a7, "href", "https://github.com/");
    			add_location(a7, file$7, 85, 28, 3593);
    			add_location(li7, file$7, 84, 24, 3560);
    			attr_dev(ul1, "class", "jca-social-icons medium-icons");
    			add_location(ul1, file$7, 68, 20, 2843);
    			attr_dev(i8, "class", "fa fa-instagram");
    			add_location(i8, file$7, 93, 33, 3961);
    			attr_dev(a8, "href", "https://www.instagram.com/");
    			add_location(a8, file$7, 92, 28, 3891);
    			add_location(li8, file$7, 91, 24, 3858);
    			attr_dev(i9, "class", "fa fa-twitter");
    			add_location(i9, file$7, 98, 33, 4175);
    			attr_dev(a9, "href", "https://twitter.com/");
    			add_location(a9, file$7, 97, 28, 4111);
    			add_location(li9, file$7, 96, 24, 4078);
    			attr_dev(i10, "class", "fa fa-linkedin");
    			add_location(i10, file$7, 103, 33, 4392);
    			attr_dev(a10, "href", "https://www.linkedin.com/");
    			add_location(a10, file$7, 102, 28, 4323);
    			add_location(li10, file$7, 101, 24, 4290);
    			attr_dev(i11, "class", "fa fa-github");
    			add_location(i11, file$7, 108, 33, 4604);
    			attr_dev(a11, "href", "https://github.com/");
    			add_location(a11, file$7, 107, 28, 4541);
    			add_location(li11, file$7, 106, 24, 4508);
    			attr_dev(ul2, "class", "jca-social-icons small-icons");
    			add_location(ul2, file$7, 90, 20, 3792);
    			attr_dev(div7, "class", "style-guide__buttons__right__container");
    			add_location(div7, file$7, 43, 16, 1808);
    			attr_dev(div8, "class", "style-guide__buttons__right");
    			add_location(div8, file$7, 41, 12, 1686);
    			attr_dev(div9, "class", "style-guide__buttons__container");
    			add_location(div9, file$7, 5, 8, 130);
    			attr_dev(div10, "class", "style-guide__buttons");
    			add_location(div10, file$7, 4, 4, 87);
    			attr_dev(div11, "class", "style-guide__row border-bottom border-top m-t-lg");
    			add_location(div11, file$7, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div6);
    			append_dev(div6, span0);
    			append_dev(div6, t1);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			append_dev(div0, button0);
    			append_dev(div5, t3);
    			append_dev(div5, div1);
    			append_dev(div1, button1);
    			append_dev(div5, t5);
    			append_dev(div5, div2);
    			append_dev(div2, button2);
    			append_dev(div5, t7);
    			append_dev(div5, div3);
    			append_dev(div3, button3);
    			append_dev(div5, t9);
    			append_dev(div5, div4);
    			append_dev(div4, button4);
    			append_dev(div4, t11);
    			append_dev(div4, button5);
    			append_dev(div9, t13);
    			append_dev(div9, div8);
    			append_dev(div8, span1);
    			append_dev(div8, t15);
    			append_dev(div8, div7);
    			append_dev(div7, br);
    			append_dev(div7, t16);
    			append_dev(div7, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(a0, i0);
    			append_dev(ul0, t17);
    			append_dev(ul0, li1);
    			append_dev(li1, a1);
    			append_dev(a1, i1);
    			append_dev(ul0, t18);
    			append_dev(ul0, li2);
    			append_dev(li2, a2);
    			append_dev(a2, i2);
    			append_dev(ul0, t19);
    			append_dev(ul0, li3);
    			append_dev(li3, a3);
    			append_dev(a3, i3);
    			append_dev(div7, t20);
    			append_dev(div7, ul1);
    			append_dev(ul1, li4);
    			append_dev(li4, a4);
    			append_dev(a4, i4);
    			append_dev(ul1, t21);
    			append_dev(ul1, li5);
    			append_dev(li5, a5);
    			append_dev(a5, i5);
    			append_dev(ul1, t22);
    			append_dev(ul1, li6);
    			append_dev(li6, a6);
    			append_dev(a6, i6);
    			append_dev(ul1, t23);
    			append_dev(ul1, li7);
    			append_dev(li7, a7);
    			append_dev(a7, i7);
    			append_dev(div7, t24);
    			append_dev(div7, ul2);
    			append_dev(ul2, li8);
    			append_dev(li8, a8);
    			append_dev(a8, i8);
    			append_dev(ul2, t25);
    			append_dev(ul2, li9);
    			append_dev(li9, a9);
    			append_dev(a9, i9);
    			append_dev(ul2, t26);
    			append_dev(ul2, li10);
    			append_dev(li10, a10);
    			append_dev(a10, i10);
    			append_dev(ul2, t27);
    			append_dev(ul2, li11);
    			append_dev(li11, a11);
    			append_dev(a11, i11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Buttons", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Buttons> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Buttons extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Buttons",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/CSS.svelte generated by Svelte v3.38.2 */

    const file$6 = "src/CSS.svelte";

    function create_fragment$6(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let code;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			code = element("code");
    			code.textContent = ".m-none\n.p-none\n.m-t-none\n.p-t-none\n.m-r-none\n.p-r-none\n.m-b-none\n.p-b-none\n.m-l-none\n.p-l-none\n.m-xxs \n.p-xxs \n.m-t-xxs \n.p-t-xxs \n.m-r-xxs \n.p-r-xxs \n.m-b-xxs \n.p-b-xxs \n.m-l-xxs \n.p-l-xxs \n.m-xs \n.p-xs \n.m-t-xs \n.p-t-xs \n.m-r-xs \n.p-r-xs \n.m-b-xs \n.p-b-xs \n.m-l-xs \n.p-l-xs \n.m-sm \n.p-sm \n.m-t-sm \n.p-t-sm \n.m-r-sm \n.p-r-sm \n.m-b-sm \n.p-b-sm \n.m-l-sm \n.p-l-sm \n.m-md\n.p-md\n.m-t-md\n.p-t-md\n.m-r-md\n.p-r-md\n.m-b-md\n.p-b-md\n.m-l-md\n.p-l-md\n.m-lg\n.p-lg\n.m-t-lg\n.p-t-lg\n.m-r-lg\n.p-r-lg\n.m-b-lg\n.p-b-lg\n.m-l-lg\n.p-l-lg\n.m-xl \n.p-xl \n.m-t-xl \n.p-t-xl \n.m-r-xl \n.p-r-xl \n.m-b-xl \n.p-b-xl \n.m-l-xl \n.p-l-xl \n.m-xxl \n.p-xxl \n.m-t-xxl\n.p-t-xxl\n.m-r-xxl\n.p-r-xxl\n.m-b-xxl\n.p-b-xxl\n.m-l-xxl\n.p-l-xxl";
    			add_location(code, file$6, 6, 12, 148);
    			attr_dev(div0, "class", "style-guide__CSS__container");
    			add_location(div0, file$6, 5, 8, 94);
    			attr_dev(div1, "class", "style-guide__CSS");
    			add_location(div1, file$6, 4, 4, 55);
    			attr_dev(div2, "class", "style-guide__row");
    			add_location(div2, file$6, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, code);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CSS", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CSS> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class CSS extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CSS",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/Timeline.svelte generated by Svelte v3.38.2 */

    const file$5 = "src/Timeline.svelte";

    function create_fragment$5(ctx) {
    	let div11;
    	let div10;
    	let div9;
    	let span0;
    	let t1;
    	let div8;
    	let div1;
    	let div0;
    	let span1;
    	let t3;
    	let h40;
    	let t5;
    	let p0;
    	let t7;
    	let div3;
    	let div2;
    	let span2;
    	let t9;
    	let h41;
    	let t11;
    	let p1;
    	let t13;
    	let div5;
    	let div4;
    	let span3;
    	let t15;
    	let h42;
    	let t17;
    	let p2;
    	let t19;
    	let div7;
    	let div6;
    	let span4;
    	let t21;
    	let h43;
    	let t23;
    	let p3;

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			span0 = element("span");
    			span0.textContent = "TIMELINE";
    			t1 = space();
    			div8 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			span1 = element("span");
    			span1.textContent = "2014-2015";
    			t3 = space();
    			h40 = element("h4");
    			h40.textContent = "Experience 1";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor sit amet,sed diam nonumy eirmod tempor\n                            invidunt.";
    			t7 = space();
    			div3 = element("div");
    			div2 = element("div");
    			span2 = element("span");
    			span2.textContent = "2014-2015";
    			t9 = space();
    			h41 = element("h4");
    			h41.textContent = "Experience 2";
    			t11 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem ipsum dolor sit amet,sed diam nonumy eirmod tempor\n                            invidunt.";
    			t13 = space();
    			div5 = element("div");
    			div4 = element("div");
    			span3 = element("span");
    			span3.textContent = "2014-2015";
    			t15 = space();
    			h42 = element("h4");
    			h42.textContent = "Experience 3";
    			t17 = space();
    			p2 = element("p");
    			p2.textContent = "Lorem ipsum dolor sit amet,sed diam nonumy eirmod tempor\n                            invidunt.";
    			t19 = space();
    			div7 = element("div");
    			div6 = element("div");
    			span4 = element("span");
    			span4.textContent = "2014-2015";
    			t21 = space();
    			h43 = element("h4");
    			h43.textContent = "Experience 4";
    			t23 = space();
    			p3 = element("p");
    			p3.textContent = "Lorem ipsum dolor sit amet,sed diam nonumy eirmod tempor\n                            invidunt.";
    			attr_dev(span0, "class", "title-section");
    			add_location(span0, file$5, 6, 12, 153);
    			attr_dev(span1, "class", "year");
    			add_location(span1, file$5, 10, 24, 375);
    			add_location(h40, file$5, 11, 24, 435);
    			add_location(p0, file$5, 12, 24, 481);
    			attr_dev(div0, "class", "jca-timeline__element__inner");
    			add_location(div0, file$5, 9, 20, 308);
    			attr_dev(div1, "class", "jca-timeline__element");
    			add_location(div1, file$5, 8, 16, 252);
    			attr_dev(span2, "class", "year");
    			add_location(span2, file$5, 20, 24, 826);
    			add_location(h41, file$5, 21, 24, 886);
    			add_location(p1, file$5, 22, 24, 932);
    			attr_dev(div2, "class", "jca-timeline__element__inner");
    			add_location(div2, file$5, 19, 20, 759);
    			attr_dev(div3, "class", "jca-timeline__element");
    			add_location(div3, file$5, 18, 16, 703);
    			attr_dev(span3, "class", "year");
    			add_location(span3, file$5, 30, 24, 1277);
    			add_location(h42, file$5, 31, 24, 1337);
    			add_location(p2, file$5, 32, 24, 1383);
    			attr_dev(div4, "class", "jca-timeline__element__inner");
    			add_location(div4, file$5, 29, 20, 1210);
    			attr_dev(div5, "class", "jca-timeline__element");
    			add_location(div5, file$5, 28, 16, 1154);
    			attr_dev(span4, "class", "year");
    			add_location(span4, file$5, 40, 24, 1728);
    			add_location(h43, file$5, 41, 24, 1788);
    			add_location(p3, file$5, 42, 24, 1834);
    			attr_dev(div6, "class", "jca-timeline__element__inner");
    			add_location(div6, file$5, 39, 20, 1661);
    			attr_dev(div7, "class", "jca-timeline__element");
    			add_location(div7, file$5, 38, 16, 1605);
    			attr_dev(div8, "class", "jca-timeline");
    			add_location(div8, file$5, 7, 12, 209);
    			attr_dev(div9, "class", "p-t-lg p-b-lg");
    			add_location(div9, file$5, 5, 8, 113);
    			attr_dev(div10, "class", "style-guide__timeline");
    			add_location(div10, file$5, 4, 4, 69);
    			attr_dev(div11, "class", "style-guide__row border-bottom");
    			add_location(div11, file$5, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, span0);
    			append_dev(div9, t1);
    			append_dev(div9, div8);
    			append_dev(div8, div1);
    			append_dev(div1, div0);
    			append_dev(div0, span1);
    			append_dev(div0, t3);
    			append_dev(div0, h40);
    			append_dev(div0, t5);
    			append_dev(div0, p0);
    			append_dev(div8, t7);
    			append_dev(div8, div3);
    			append_dev(div3, div2);
    			append_dev(div2, span2);
    			append_dev(div2, t9);
    			append_dev(div2, h41);
    			append_dev(div2, t11);
    			append_dev(div2, p1);
    			append_dev(div8, t13);
    			append_dev(div8, div5);
    			append_dev(div5, div4);
    			append_dev(div4, span3);
    			append_dev(div4, t15);
    			append_dev(div4, h42);
    			append_dev(div4, t17);
    			append_dev(div4, p2);
    			append_dev(div8, t19);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, span4);
    			append_dev(div6, t21);
    			append_dev(div6, h43);
    			append_dev(div6, t23);
    			append_dev(div6, p3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Timeline", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Timeline> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Timeline extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timeline",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/Cards.svelte generated by Svelte v3.38.2 */

    const file$4 = "src/Cards.svelte";

    function create_fragment$4(ctx) {
    	let div14;
    	let div13;
    	let span0;
    	let t1;
    	let div12;
    	let div3;
    	let div2;
    	let div0;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t2;
    	let a1;
    	let span1;
    	let t4;
    	let div1;
    	let h40;
    	let a2;
    	let t6;
    	let p0;
    	let t8;
    	let a3;
    	let t10;
    	let div7;
    	let div6;
    	let div4;
    	let a4;
    	let img1;
    	let img1_src_value;
    	let t11;
    	let a5;
    	let span2;
    	let t13;
    	let div5;
    	let h41;
    	let a6;
    	let t15;
    	let p1;
    	let t17;
    	let a7;
    	let t19;
    	let div11;
    	let div10;
    	let div8;
    	let a8;
    	let img2;
    	let img2_src_value;
    	let t20;
    	let a9;
    	let span3;
    	let t22;
    	let div9;
    	let h42;
    	let a10;
    	let t24;
    	let p2;
    	let t26;
    	let a11;

    	const block = {
    		c: function create() {
    			div14 = element("div");
    			div13 = element("div");
    			span0 = element("span");
    			span0.textContent = "CARDS";
    			t1 = space();
    			div12 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t2 = space();
    			a1 = element("a");
    			span1 = element("span");
    			span1.textContent = "26 jun";
    			t4 = space();
    			div1 = element("div");
    			h40 = element("h4");
    			a2 = element("a");
    			a2.textContent = "Aenean mattis tortor ac sapien molestie.";
    			t6 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor sit amet,consetetur sadipscing elitr,\n                            At vero eos et accusam et justo duo dolores rebum.";
    			t8 = space();
    			a3 = element("a");
    			a3.textContent = "Read More";
    			t10 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div4 = element("div");
    			a4 = element("a");
    			img1 = element("img");
    			t11 = space();
    			a5 = element("a");
    			span2 = element("span");
    			span2.textContent = "26 jun";
    			t13 = space();
    			div5 = element("div");
    			h41 = element("h4");
    			a6 = element("a");
    			a6.textContent = "Aenean mattis tortor ac sapien molestie.";
    			t15 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem ipsum dolor sit amet,consetetur sadipscing elitr,\n                            At vero eos et accusam et justo duo dolores rebum.";
    			t17 = space();
    			a7 = element("a");
    			a7.textContent = "Read More";
    			t19 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div8 = element("div");
    			a8 = element("a");
    			img2 = element("img");
    			t20 = space();
    			a9 = element("a");
    			span3 = element("span");
    			span3.textContent = "26 jun";
    			t22 = space();
    			div9 = element("div");
    			h42 = element("h4");
    			a10 = element("a");
    			a10.textContent = "Aenean mattis tortor ac sapien molestie.";
    			t24 = space();
    			p2 = element("p");
    			p2.textContent = "Lorem ipsum dolor sit amet,consetetur sadipscing elitr,\n                            At vero eos et accusam et justo duo dolores rebum.";
    			t26 = space();
    			a11 = element("a");
    			a11.textContent = "Read More";
    			attr_dev(span0, "class", "title-section");
    			add_location(span0, file$4, 5, 8, 110);
    			if (img0.src !== (img0_src_value = "https://juancamejoalarcon.s3.eu-west-3.amazonaws.com/assets/blog/1.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "post-img");
    			add_location(img0, file$4, 11, 29, 382);
    			attr_dev(a0, "href", "blog-single.html");
    			add_location(a0, file$4, 10, 24, 326);
    			add_location(span1, file$4, 17, 29, 707);
    			attr_dev(a1, "href", "blog-grid.html");
    			attr_dev(a1, "class", "card__thumb__date");
    			add_location(a1, file$4, 16, 24, 627);
    			attr_dev(div0, "class", "card__thumb");
    			add_location(div0, file$4, 9, 20, 276);
    			attr_dev(a2, "href", "blog-single.html");
    			add_location(a2, file$4, 22, 28, 888);
    			add_location(h40, file$4, 21, 24, 855);
    			add_location(p0, file$4, 26, 24, 1076);
    			attr_dev(a3, "class", "card__content__read-more");
    			attr_dev(a3, "href", "blog-single.html");
    			add_location(a3, file$4, 30, 24, 1296);
    			attr_dev(div1, "class", "card__content");
    			add_location(div1, file$4, 20, 20, 803);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$4, 8, 16, 237);
    			add_location(div3, file$4, 7, 12, 215);
    			if (img1.src !== (img1_src_value = "https://juancamejoalarcon.s3.eu-west-3.amazonaws.com/assets/blog/1.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "post-img");
    			add_location(img1, file$4, 38, 29, 1629);
    			attr_dev(a4, "href", "blog-single.html");
    			add_location(a4, file$4, 37, 24, 1573);
    			add_location(span2, file$4, 44, 29, 1954);
    			attr_dev(a5, "href", "blog-grid.html");
    			attr_dev(a5, "class", "card__thumb__date");
    			add_location(a5, file$4, 43, 24, 1874);
    			attr_dev(div4, "class", "card__thumb");
    			add_location(div4, file$4, 36, 20, 1523);
    			attr_dev(a6, "href", "blog-single.html");
    			add_location(a6, file$4, 49, 28, 2135);
    			add_location(h41, file$4, 48, 24, 2102);
    			add_location(p1, file$4, 53, 24, 2323);
    			attr_dev(a7, "class", "card__content__read-more");
    			attr_dev(a7, "href", "blog-single.html");
    			add_location(a7, file$4, 57, 24, 2543);
    			attr_dev(div5, "class", "card__content");
    			add_location(div5, file$4, 47, 20, 2050);
    			attr_dev(div6, "class", "card hover-item");
    			add_location(div6, file$4, 35, 16, 1473);
    			add_location(div7, file$4, 34, 12, 1451);
    			if (img2.src !== (img2_src_value = "https://juancamejoalarcon.s3.eu-west-3.amazonaws.com/assets/blog/1.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "post-img");
    			add_location(img2, file$4, 65, 29, 2876);
    			attr_dev(a8, "href", "blog-single.html");
    			add_location(a8, file$4, 64, 24, 2820);
    			add_location(span3, file$4, 71, 29, 3201);
    			attr_dev(a9, "href", "blog-grid.html");
    			attr_dev(a9, "class", "card__thumb__date");
    			add_location(a9, file$4, 70, 24, 3121);
    			attr_dev(div8, "class", "card__thumb");
    			add_location(div8, file$4, 63, 20, 2770);
    			attr_dev(a10, "href", "blog-single.html");
    			add_location(a10, file$4, 76, 28, 3382);
    			add_location(h42, file$4, 75, 24, 3349);
    			add_location(p2, file$4, 80, 24, 3570);
    			attr_dev(a11, "class", "card__content__read-more");
    			attr_dev(a11, "href", "blog-single.html");
    			add_location(a11, file$4, 84, 24, 3790);
    			attr_dev(div9, "class", "card__content");
    			add_location(div9, file$4, 74, 20, 3297);
    			attr_dev(div10, "class", "card hover-item");
    			add_location(div10, file$4, 62, 16, 2720);
    			add_location(div11, file$4, 61, 12, 2698);
    			attr_dev(div12, "class", "style-guide__cards__container");
    			add_location(div12, file$4, 6, 8, 159);
    			attr_dev(div13, "class", "style-guide__cards");
    			add_location(div13, file$4, 4, 4, 69);
    			attr_dev(div14, "class", "style-guide__row border-bottom");
    			add_location(div14, file$4, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div13);
    			append_dev(div13, span0);
    			append_dev(div13, t1);
    			append_dev(div13, div12);
    			append_dev(div12, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img0);
    			append_dev(div0, t2);
    			append_dev(div0, a1);
    			append_dev(a1, span1);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, h40);
    			append_dev(h40, a2);
    			append_dev(div1, t6);
    			append_dev(div1, p0);
    			append_dev(div1, t8);
    			append_dev(div1, a3);
    			append_dev(div12, t10);
    			append_dev(div12, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div4, a4);
    			append_dev(a4, img1);
    			append_dev(div4, t11);
    			append_dev(div4, a5);
    			append_dev(a5, span2);
    			append_dev(div6, t13);
    			append_dev(div6, div5);
    			append_dev(div5, h41);
    			append_dev(h41, a6);
    			append_dev(div5, t15);
    			append_dev(div5, p1);
    			append_dev(div5, t17);
    			append_dev(div5, a7);
    			append_dev(div12, t19);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div8);
    			append_dev(div8, a8);
    			append_dev(a8, img2);
    			append_dev(div8, t20);
    			append_dev(div8, a9);
    			append_dev(a9, span3);
    			append_dev(div10, t22);
    			append_dev(div10, div9);
    			append_dev(div9, h42);
    			append_dev(h42, a10);
    			append_dev(div9, t24);
    			append_dev(div9, p2);
    			append_dev(div9, t26);
    			append_dev(div9, a11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div14);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Cards", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Cards> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Cards extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Cards",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/Inputs.svelte generated by Svelte v3.38.2 */

    const file$3 = "src/Inputs.svelte";

    function create_fragment$3(ctx) {
    	let div16;
    	let div15;
    	let span;
    	let t1;
    	let div14;
    	let div1;
    	let div0;
    	let input0;
    	let t2;
    	let label0;
    	let t4;
    	let div5;
    	let div2;
    	let input1;
    	let t5;
    	let label1;
    	let t7;
    	let div4;
    	let div3;
    	let t9;
    	let div7;
    	let div6;
    	let input2;
    	let t10;
    	let label2;
    	let t12;
    	let div9;
    	let div8;
    	let input3;
    	let t13;
    	let label3;
    	let t15;
    	let div13;
    	let div10;
    	let input4;
    	let t16;
    	let label4;
    	let t18;
    	let div12;
    	let div11;

    	const block = {
    		c: function create() {
    			div16 = element("div");
    			div15 = element("div");
    			span = element("span");
    			span.textContent = "INPUTS";
    			t1 = space();
    			div14 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t2 = space();
    			label0 = element("label");
    			label0.textContent = "Default";
    			t4 = space();
    			div5 = element("div");
    			div2 = element("div");
    			input1 = element("input");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Default";
    			t7 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div3.textContent = "This a default input";
    			t9 = space();
    			div7 = element("div");
    			div6 = element("div");
    			input2 = element("input");
    			t10 = space();
    			label2 = element("label");
    			label2.textContent = "Disabled";
    			t12 = space();
    			div9 = element("div");
    			div8 = element("div");
    			input3 = element("input");
    			t13 = space();
    			label3 = element("label");
    			label3.textContent = "Default input";
    			t15 = space();
    			div13 = element("div");
    			div10 = element("div");
    			input4 = element("input");
    			t16 = space();
    			label4 = element("label");
    			label4.textContent = "Default input";
    			t18 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div11.textContent = "There is an error with this input";
    			attr_dev(span, "class", "title-section");
    			add_location(span, file$3, 5, 8, 111);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "autocomplete", "disabled");
    			attr_dev(input0, "autocorrect", "off");
    			attr_dev(input0, "autocapitalize", "characters");
    			attr_dev(input0, "spellcheck", "false");
    			attr_dev(input0, "maxlength", "524288");
    			attr_dev(input0, "placeholder", " ");
    			attr_dev(input0, "aria-label", "Default");
    			add_location(input0, file$3, 9, 20, 324);
    			add_location(label0, file$3, 20, 20, 800);
    			attr_dev(div0, "class", "jca-input-text");
    			add_location(div0, file$3, 8, 16, 275);
    			attr_dev(div1, "class", "style-guide__inputs__input");
    			add_location(div1, file$3, 7, 12, 218);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "autocomplete", "disabled");
    			attr_dev(input1, "autocorrect", "off");
    			attr_dev(input1, "autocapitalize", "characters");
    			attr_dev(input1, "spellcheck", "false");
    			attr_dev(input1, "maxlength", "524288");
    			attr_dev(input1, "placeholder", " ");
    			attr_dev(input1, "aria-label", "Default");
    			input1.value = "This is a default input filled";
    			add_location(input1, file$3, 25, 20, 983);
    			add_location(label1, file$3, 37, 20, 1522);
    			attr_dev(div2, "class", "jca-input-text");
    			add_location(div2, file$3, 24, 16, 934);
    			add_location(div3, file$3, 40, 20, 1640);
    			attr_dev(div4, "class", "jca-input-text-bellow");
    			add_location(div4, file$3, 39, 16, 1584);
    			attr_dev(div5, "class", "style-guide__inputs__input");
    			add_location(div5, file$3, 23, 12, 877);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "autocomplete", "disabled");
    			attr_dev(input2, "autocorrect", "off");
    			attr_dev(input2, "autocapitalize", "characters");
    			attr_dev(input2, "spellcheck", "false");
    			attr_dev(input2, "maxlength", "524288");
    			attr_dev(input2, "placeholder", " ");
    			attr_dev(input2, "aria-label", "Disabled");
    			input2.disabled = true;
    			add_location(input2, file$3, 47, 20, 1888);
    			add_location(label2, file$3, 59, 20, 2398);
    			attr_dev(div6, "class", "jca-input-text _disabled");
    			add_location(div6, file$3, 46, 16, 1829);
    			attr_dev(div7, "class", "style-guide__inputs__input");
    			add_location(div7, file$3, 45, 12, 1772);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "autocomplete", "disabled");
    			attr_dev(input3, "autocorrect", "off");
    			attr_dev(input3, "autocapitalize", "characters");
    			attr_dev(input3, "spellcheck", "false");
    			attr_dev(input3, "maxlength", "524288");
    			attr_dev(input3, "placeholder", " ");
    			attr_dev(input3, "aria-label", "Default input");
    			add_location(input3, file$3, 64, 20, 2594);
    			add_location(label3, file$3, 75, 20, 3076);
    			attr_dev(div8, "class", "jca-input-text _show-error");
    			add_location(div8, file$3, 63, 16, 2533);
    			attr_dev(div9, "class", "style-guide__inputs__input");
    			add_location(div9, file$3, 62, 12, 2476);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "autocomplete", "disabled");
    			attr_dev(input4, "autocorrect", "off");
    			attr_dev(input4, "autocapitalize", "characters");
    			attr_dev(input4, "spellcheck", "false");
    			attr_dev(input4, "maxlength", "524288");
    			attr_dev(input4, "placeholder", " ");
    			attr_dev(input4, "aria-label", "Default input");
    			add_location(input4, file$3, 80, 20, 3277);
    			add_location(label4, file$3, 91, 20, 3759);
    			attr_dev(div10, "class", "jca-input-text _show-error");
    			add_location(div10, file$3, 79, 16, 3216);
    			add_location(div11, file$3, 94, 20, 3883);
    			attr_dev(div12, "class", "jca-input-text-bellow");
    			add_location(div12, file$3, 93, 16, 3827);
    			attr_dev(div13, "class", "style-guide__inputs__input");
    			add_location(div13, file$3, 78, 12, 3159);
    			attr_dev(div14, "class", "style-guide__inputs__container");
    			add_location(div14, file$3, 6, 8, 161);
    			attr_dev(div15, "class", "style-guide__inputs");
    			add_location(div15, file$3, 4, 4, 69);
    			attr_dev(div16, "class", "style-guide__row border-bottom");
    			add_location(div16, file$3, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div16, anchor);
    			append_dev(div16, div15);
    			append_dev(div15, span);
    			append_dev(div15, t1);
    			append_dev(div15, div14);
    			append_dev(div14, div1);
    			append_dev(div1, div0);
    			append_dev(div0, input0);
    			append_dev(div0, t2);
    			append_dev(div0, label0);
    			append_dev(div14, t4);
    			append_dev(div14, div5);
    			append_dev(div5, div2);
    			append_dev(div2, input1);
    			append_dev(div2, t5);
    			append_dev(div2, label1);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div14, t9);
    			append_dev(div14, div7);
    			append_dev(div7, div6);
    			append_dev(div6, input2);
    			append_dev(div6, t10);
    			append_dev(div6, label2);
    			append_dev(div14, t12);
    			append_dev(div14, div9);
    			append_dev(div9, div8);
    			append_dev(div8, input3);
    			append_dev(div8, t13);
    			append_dev(div8, label3);
    			append_dev(div14, t15);
    			append_dev(div14, div13);
    			append_dev(div13, div10);
    			append_dev(div10, input4);
    			append_dev(div10, t16);
    			append_dev(div10, label4);
    			append_dev(div13, t18);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div16);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Inputs", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Inputs> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Inputs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Inputs",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/Textarea.svelte generated by Svelte v3.38.2 */

    const file$2 = "src/Textarea.svelte";

    function create_fragment$2(ctx) {
    	let div12;
    	let div11;
    	let span;
    	let t1;
    	let div10;
    	let div1;
    	let div0;
    	let textarea0;
    	let t2;
    	let label0;
    	let t4;
    	let div3;
    	let div2;
    	let textarea1;
    	let t5;
    	let label1;
    	let t7;
    	let div5;
    	let div4;
    	let textarea2;
    	let t8;
    	let label2;
    	let t10;
    	let div9;
    	let div6;
    	let textarea3;
    	let t11;
    	let label3;
    	let t13;
    	let div8;
    	let div7;

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			div11 = element("div");
    			span = element("span");
    			span.textContent = "Textarea";
    			t1 = space();
    			div10 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			textarea0 = element("textarea");
    			t2 = space();
    			label0 = element("label");
    			label0.textContent = "Default input";
    			t4 = space();
    			div3 = element("div");
    			div2 = element("div");
    			textarea1 = element("textarea");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Default input filled";
    			t7 = space();
    			div5 = element("div");
    			div4 = element("div");
    			textarea2 = element("textarea");
    			t8 = space();
    			label2 = element("label");
    			label2.textContent = "Disabled";
    			t10 = space();
    			div9 = element("div");
    			div6 = element("div");
    			textarea3 = element("textarea");
    			t11 = space();
    			label3 = element("label");
    			label3.textContent = "Default input error";
    			t13 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div7.textContent = "There is an error with this input";
    			attr_dev(span, "class", "title-section");
    			add_location(span, file$2, 5, 8, 114);
    			attr_dev(textarea0, "placeholder", " ");
    			add_location(textarea0, file$2, 9, 20, 336);
    			add_location(label0, file$2, 11, 20, 462);
    			attr_dev(div0, "class", "jca-textarea");
    			add_location(div0, file$2, 8, 16, 289);
    			attr_dev(div1, "class", "style-guide__textareas__textarea");
    			add_location(div1, file$2, 7, 12, 226);
    			attr_dev(textarea1, "placeholder", " ");
    			textarea1.value = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales mauris interdum volutpat eleifend. Quisque ac dui id nulla porttitor pellentesque. In ante metus, commodo id consequat quis, tristique eget ipsum. Nunc urna lorem, semper quis suscipit eget, ullamcorper vel turpis. In neque odio, tristique molestie posuere nec, consequat eu dolor. Nullam porta mollis eros sed placerat. Donec ac magna at ante facilisis sagittis. Proin malesuada at metus non elementum. Vestibulum justo odio, vulputate sed ultricies vel, dictum at est. Suspendisse non nulla non dolor laoreet convallis at ac justo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eget pharetra arcu. Vivamus ut vestibulum eros. \n\n                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales mauris interdum volutpat eleifend. Quisque ac dui id nulla porttitor pellentesque. In ante metus, commodo id consequat quis, tristique eget ipsum. Nunc urna lorem, semper quis suscipit eget, ullamcorper vel turpis. In neque odio, tristique molestie posuere nec, consequat eu dolor. Nullam porta mollis eros sed placerat. Donec ac magna at ante facilisis sagittis. Proin malesuada at metus non elementum. Vestibulum justo odio, vulputate sed ultricies vel, dictum at est. Suspendisse non nulla non dolor laoreet convallis at ac justo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eget pharetra arcu. Vivamus ut vestibulum eros. \n\n                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales mauris interdum volutpat eleifend. Quisque ac dui id nulla porttitor pellentesque. In ante metus, commodo id consequat quis, tristique eget ipsum. Nunc urna lorem, semper quis suscipit eget, ullamcorper vel turpis. In neque odio, tristique molestie posuere nec, consequat eu dolor. Nullam porta mollis eros sed placerat. Donec ac magna at ante facilisis sagittis. Proin malesuada at metus non elementum. Vestibulum justo odio, vulputate sed ultricies vel, dictum at est. Suspendisse non nulla non dolor laoreet convallis at ac justo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eget pharetra arcu. Vivamus ut vestibulum eros.";
    			add_location(textarea1, file$2, 16, 20, 655);
    			add_location(label1, file$2, 22, 20, 3002);
    			attr_dev(div2, "class", "jca-textarea");
    			add_location(div2, file$2, 15, 16, 608);
    			attr_dev(div3, "class", "style-guide__textareas__textarea");
    			add_location(div3, file$2, 14, 12, 545);
    			attr_dev(textarea2, "placeholder", " ");
    			textarea2.disabled = true;
    			textarea2.value = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales mauris interdum volutpat eleifend. Quisque ac dui id nulla porttitor pellentesque. In ante metus, commodo id consequat quis, tristique eget ipsum. Nunc urna lorem, semper quis suscipit eget, ullamcorper vel turpis. In neque odio, tristique molestie posuere nec, consequat eu dolor. Nullam porta mollis eros sed placerat. Donec ac magna at ante facilisis sagittis. Proin malesuada at metus non elementum. Vestibulum justo odio, vulputate sed ultricies vel, dictum at est. Suspendisse non nulla non dolor laoreet convallis at ac justo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eget pharetra arcu. Vivamus ut vestibulum eros. \n\n                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales mauris interdum volutpat eleifend. Quisque ac dui id nulla porttitor pellentesque. In ante metus, commodo id consequat quis, tristique eget ipsum. Nunc urna lorem, semper quis suscipit eget, ullamcorper vel turpis. In neque odio, tristique molestie posuere nec, consequat eu dolor. Nullam porta mollis eros sed placerat. Donec ac magna at ante facilisis sagittis. Proin malesuada at metus non elementum. Vestibulum justo odio, vulputate sed ultricies vel, dictum at est. Suspendisse non nulla non dolor laoreet convallis at ac justo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eget pharetra arcu. Vivamus ut vestibulum eros. \n\n                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales mauris interdum volutpat eleifend. Quisque ac dui id nulla porttitor pellentesque. In ante metus, commodo id consequat quis, tristique eget ipsum. Nunc urna lorem, semper quis suscipit eget, ullamcorper vel turpis. In neque odio, tristique molestie posuere nec, consequat eu dolor. Nullam porta mollis eros sed placerat. Donec ac magna at ante facilisis sagittis. Proin malesuada at metus non elementum. Vestibulum justo odio, vulputate sed ultricies vel, dictum at est. Suspendisse non nulla non dolor laoreet convallis at ac justo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eget pharetra arcu. Vivamus ut vestibulum eros.";
    			add_location(textarea2, file$2, 27, 20, 3212);
    			add_location(label2, file$2, 33, 20, 5568);
    			attr_dev(div4, "class", "jca-textarea _disabled");
    			add_location(div4, file$2, 26, 16, 3155);
    			attr_dev(div5, "class", "style-guide__textareas__textarea");
    			add_location(div5, file$2, 25, 12, 3092);
    			attr_dev(textarea3, "placeholder", " ");
    			textarea3.value = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales mauris interdum volutpat eleifend. Quisque ac dui id nulla porttitor pellentesque. In ante metus, commodo id consequat quis, tristique eget ipsum. Nunc urna lorem, semper quis suscipit eget, ullamcorper vel turpis. In neque odio, tristique molestie posuere nec, consequat eu dolor. Nullam porta mollis eros sed placerat. Donec ac magna at ante facilisis sagittis. Proin malesuada at metus non elementum. Vestibulum justo odio, vulputate sed ultricies vel, dictum at est. Suspendisse non nulla non dolor laoreet convallis at ac justo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eget pharetra arcu. Vivamus ut vestibulum eros. \n\n                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales mauris interdum volutpat eleifend. Quisque ac dui id nulla porttitor pellentesque. In ante metus, commodo id consequat quis, tristique eget ipsum. Nunc urna lorem, semper quis suscipit eget, ullamcorper vel turpis. In neque odio, tristique molestie posuere nec, consequat eu dolor. Nullam porta mollis eros sed placerat. Donec ac magna at ante facilisis sagittis. Proin malesuada at metus non elementum. Vestibulum justo odio, vulputate sed ultricies vel, dictum at est. Suspendisse non nulla non dolor laoreet convallis at ac justo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eget pharetra arcu. Vivamus ut vestibulum eros. \n\n                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales mauris interdum volutpat eleifend. Quisque ac dui id nulla porttitor pellentesque. In ante metus, commodo id consequat quis, tristique eget ipsum. Nunc urna lorem, semper quis suscipit eget, ullamcorper vel turpis. In neque odio, tristique molestie posuere nec, consequat eu dolor. Nullam porta mollis eros sed placerat. Donec ac magna at ante facilisis sagittis. Proin malesuada at metus non elementum. Vestibulum justo odio, vulputate sed ultricies vel, dictum at est. Suspendisse non nulla non dolor laoreet convallis at ac justo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eget pharetra arcu. Vivamus ut vestibulum eros.";
    			add_location(textarea3, file$2, 38, 20, 5768);
    			add_location(label3, file$2, 44, 20, 8115);
    			attr_dev(div6, "class", "jca-textarea _show-error");
    			add_location(div6, file$2, 37, 16, 5709);
    			add_location(div7, file$2, 47, 20, 8243);
    			attr_dev(div8, "class", "jca-textarea-bellow");
    			add_location(div8, file$2, 46, 16, 8189);
    			attr_dev(div9, "class", "style-guide__textareas__textarea");
    			add_location(div9, file$2, 36, 12, 5646);
    			attr_dev(div10, "class", "style-guide__textareas__container");
    			add_location(div10, file$2, 6, 8, 166);
    			attr_dev(div11, "class", "style-guide__textareas");
    			add_location(div11, file$2, 4, 4, 69);
    			attr_dev(div12, "class", "style-guide__row border-bottom");
    			add_location(div12, file$2, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div11);
    			append_dev(div11, span);
    			append_dev(div11, t1);
    			append_dev(div11, div10);
    			append_dev(div10, div1);
    			append_dev(div1, div0);
    			append_dev(div0, textarea0);
    			append_dev(div0, t2);
    			append_dev(div0, label0);
    			append_dev(div10, t4);
    			append_dev(div10, div3);
    			append_dev(div3, div2);
    			append_dev(div2, textarea1);
    			append_dev(div2, t5);
    			append_dev(div2, label1);
    			append_dev(div10, t7);
    			append_dev(div10, div5);
    			append_dev(div5, div4);
    			append_dev(div4, textarea2);
    			append_dev(div4, t8);
    			append_dev(div4, label2);
    			append_dev(div10, t10);
    			append_dev(div10, div9);
    			append_dev(div9, div6);
    			append_dev(div6, textarea3);
    			append_dev(div6, t11);
    			append_dev(div6, label3);
    			append_dev(div9, t13);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Textarea", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Textarea> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Textarea extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Textarea",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Select.svelte generated by Svelte v3.38.2 */

    const file$1 = "src/Select.svelte";

    function create_fragment$1(ctx) {
    	let div4;
    	let div3;
    	let span;
    	let t1;
    	let div2;
    	let div1;
    	let div0;
    	let label;
    	let t3;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let option9;
    	let option10;
    	let option11;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			span = element("span");
    			span.textContent = "INPUTS";
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			label = element("label");
    			label.textContent = "Default";
    			t3 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "January";
    			option1 = element("option");
    			option1.textContent = "February";
    			option2 = element("option");
    			option2.textContent = "March";
    			option3 = element("option");
    			option3.textContent = "April";
    			option4 = element("option");
    			option4.textContent = "May";
    			option5 = element("option");
    			option5.textContent = "June";
    			option6 = element("option");
    			option6.textContent = "July";
    			option7 = element("option");
    			option7.textContent = "August";
    			option8 = element("option");
    			option8.textContent = "September";
    			option9 = element("option");
    			option9.textContent = "October";
    			option10 = element("option");
    			option10.textContent = "November";
    			option11 = element("option");
    			option11.textContent = "December";
    			attr_dev(span, "class", "title-section");
    			add_location(span, file$1, 5, 8, 112);
    			add_location(label, file$1, 10, 20, 401);
    			option0.__value = "january";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 12, 24, 477);
    			option1.__value = "february";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 13, 24, 542);
    			option2.__value = "march";
    			option2.value = option2.__value;
    			add_location(option2, file$1, 14, 24, 609);
    			option3.__value = "april";
    			option3.value = option3.__value;
    			add_location(option3, file$1, 15, 24, 670);
    			option4.__value = "may";
    			option4.value = option4.__value;
    			add_location(option4, file$1, 16, 24, 731);
    			option5.__value = "june";
    			option5.value = option5.__value;
    			add_location(option5, file$1, 17, 24, 788);
    			option6.__value = "july";
    			option6.value = option6.__value;
    			add_location(option6, file$1, 18, 24, 847);
    			option7.__value = "august";
    			option7.value = option7.__value;
    			add_location(option7, file$1, 19, 24, 906);
    			option8.__value = "september";
    			option8.value = option8.__value;
    			add_location(option8, file$1, 20, 24, 969);
    			option9.__value = "october";
    			option9.value = option9.__value;
    			add_location(option9, file$1, 21, 24, 1038);
    			option10.__value = "november";
    			option10.value = option10.__value;
    			add_location(option10, file$1, 22, 24, 1103);
    			option11.__value = "december";
    			option11.value = option11.__value;
    			add_location(option11, file$1, 23, 24, 1170);
    			add_location(select, file$1, 11, 20, 444);
    			attr_dev(div0, "class", "jca-select");
    			add_location(div0, file$1, 8, 16, 279);
    			attr_dev(div1, "class", "style-guide__selects__select");
    			add_location(div1, file$1, 7, 12, 220);
    			attr_dev(div2, "class", "style-guide__selects__container");
    			add_location(div2, file$1, 6, 8, 162);
    			attr_dev(div3, "class", "style-guide__selects");
    			add_location(div3, file$1, 4, 4, 69);
    			attr_dev(div4, "class", "style-guide__row border-bottom");
    			add_location(div4, file$1, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, span);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, label);
    			append_dev(div0, t3);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(select, option4);
    			append_dev(select, option5);
    			append_dev(select, option6);
    			append_dev(select, option7);
    			append_dev(select, option8);
    			append_dev(select, option9);
    			append_dev(select, option10);
    			append_dev(select, option11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Select", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Select> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Select extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Select",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div1;
    	let div0;
    	let logos;
    	let t0;
    	let colors;
    	let t1;
    	let fonts;
    	let t2;
    	let buttons;
    	let t3;
    	let inputs;
    	let t4;
    	let textarea;
    	let t5;
    	let select;
    	let t6;
    	let cards;
    	let t7;
    	let timeline;
    	let current;
    	logos = new Logos({ $$inline: true });
    	colors = new Colors({ $$inline: true });
    	fonts = new Fonts({ $$inline: true });
    	buttons = new Buttons({ $$inline: true });
    	inputs = new Inputs({ $$inline: true });
    	textarea = new Textarea({ $$inline: true });
    	select = new Select({ $$inline: true });
    	cards = new Cards({ $$inline: true });
    	timeline = new Timeline({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			div0 = element("div");
    			create_component(logos.$$.fragment);
    			t0 = space();
    			create_component(colors.$$.fragment);
    			t1 = space();
    			create_component(fonts.$$.fragment);
    			t2 = space();
    			create_component(buttons.$$.fragment);
    			t3 = space();
    			create_component(inputs.$$.fragment);
    			t4 = space();
    			create_component(textarea.$$.fragment);
    			t5 = space();
    			create_component(select.$$.fragment);
    			t6 = space();
    			create_component(cards.$$.fragment);
    			t7 = space();
    			create_component(timeline.$$.fragment);
    			attr_dev(div0, "class", "style-guide__container");
    			add_location(div0, file, 15, 2, 444);
    			attr_dev(div1, "class", "style-guide");
    			add_location(div1, file, 14, 1, 416);
    			add_location(main, file, 13, 0, 408);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			append_dev(div1, div0);
    			mount_component(logos, div0, null);
    			append_dev(div0, t0);
    			mount_component(colors, div0, null);
    			append_dev(div0, t1);
    			mount_component(fonts, div0, null);
    			append_dev(div0, t2);
    			mount_component(buttons, div0, null);
    			append_dev(div0, t3);
    			mount_component(inputs, div0, null);
    			append_dev(div0, t4);
    			mount_component(textarea, div0, null);
    			append_dev(div0, t5);
    			mount_component(select, div0, null);
    			append_dev(div0, t6);
    			mount_component(cards, div0, null);
    			append_dev(div0, t7);
    			mount_component(timeline, div0, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(logos.$$.fragment, local);
    			transition_in(colors.$$.fragment, local);
    			transition_in(fonts.$$.fragment, local);
    			transition_in(buttons.$$.fragment, local);
    			transition_in(inputs.$$.fragment, local);
    			transition_in(textarea.$$.fragment, local);
    			transition_in(select.$$.fragment, local);
    			transition_in(cards.$$.fragment, local);
    			transition_in(timeline.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(logos.$$.fragment, local);
    			transition_out(colors.$$.fragment, local);
    			transition_out(fonts.$$.fragment, local);
    			transition_out(buttons.$$.fragment, local);
    			transition_out(inputs.$$.fragment, local);
    			transition_out(textarea.$$.fragment, local);
    			transition_out(select.$$.fragment, local);
    			transition_out(cards.$$.fragment, local);
    			transition_out(timeline.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(logos);
    			destroy_component(colors);
    			destroy_component(fonts);
    			destroy_component(buttons);
    			destroy_component(inputs);
    			destroy_component(textarea);
    			destroy_component(select);
    			destroy_component(cards);
    			destroy_component(timeline);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Logos,
    		Colors,
    		Fonts,
    		Buttons,
    		CSS,
    		Timeline,
    		Cards,
    		Inputs,
    		Textarea,
    		Select
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
