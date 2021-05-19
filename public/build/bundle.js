
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
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

    const file$4 = "src/Logos.svelte";

    function create_fragment$4(ctx) {
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
    			add_location(span0, file$4, 11, 16, 421);
    			if (img0.src !== (img0_src_value = /*firstLogoUrl*/ ctx[0])) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "logo");
    			add_location(img0, file$4, 12, 16, 485);
    			attr_dev(div0, "class", "style-guide__logos__first");
    			add_location(div0, file$4, 10, 12, 365);
    			attr_dev(span1, "class", "title-section");
    			add_location(span1, file$4, 15, 16, 611);
    			if (img1.src !== (img1_src_value = /*secondLogoUrl*/ ctx[1])) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "logo2");
    			add_location(img1, file$4, 16, 16, 677);
    			attr_dev(div1, "class", "style-guide__logos__second");
    			add_location(div1, file$4, 14, 12, 554);
    			attr_dev(div2, "class", "style-guide__logos__container");
    			add_location(div2, file$4, 9, 8, 309);
    			attr_dev(div3, "class", "style-guide__logos");
    			add_location(div3, file$4, 8, 4, 268);
    			attr_dev(div4, "class", "style-guide__row border-bottom");
    			add_location(div4, file$4, 7, 0, 219);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Logos", slots, []);
    	let firstLogoUrl = "https://juancamejoalarcon.s3.eu-west-3.amazonaws.com/logo-v2.svg";
    	let secondLogoUrl = "https://juancamejoalarcon.s3.eu-west-3.amazonaws.com/logo-v1.svg";
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logos",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/Colors.svelte generated by Svelte v3.38.2 */

    const file$3 = "src/Colors.svelte";

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
    			add_location(div0, file$3, 16, 20, 687);
    			attr_dev(span0, "class", "style-guide__colors__color__title");
    			add_location(span0, file$3, 17, 20, 799);
    			attr_dev(span1, "class", "style-guide__colors__color__ref");
    			add_location(span1, file$3, 18, 20, 875);
    			attr_dev(span2, "class", "style-guide__colors__color__ref");
    			add_location(span2, file$3, 19, 20, 960);
    			attr_dev(div1, "class", "style-guide__colors__color");
    			add_location(div1, file$3, 15, 16, 626);
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

    function create_fragment$3(ctx) {
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
    			add_location(span, file$3, 13, 12, 532);
    			attr_dev(div0, "class", "style-guide__colors__container");
    			add_location(div0, file$3, 12, 8, 475);
    			attr_dev(div1, "class", "style-guide__colors");
    			add_location(div1, file$3, 11, 4, 433);
    			attr_dev(div2, "class", "style-guide__row border-bottom");
    			add_location(div2, file$3, 10, 0, 384);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Colors",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/Fonts.svelte generated by Svelte v3.38.2 */

    const file$2 = "src/Fonts.svelte";

    function create_fragment$2(ctx) {
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
    			h1.textContent = "h1 headline";
    			t35 = space();
    			h2 = element("h2");
    			h2.textContent = "h2 headline";
    			t37 = space();
    			h3 = element("h3");
    			h3.textContent = "h3 headline";
    			t39 = space();
    			h4 = element("h4");
    			h4.textContent = "h4 headline";
    			t41 = space();
    			h5 = element("h5");
    			h5.textContent = "h5 headline";
    			t43 = space();
    			h6 = element("h6");
    			h6.textContent = "h6 headline";
    			attr_dev(span0, "class", "title-section");
    			add_location(span0, file$2, 6, 12, 152);
    			attr_dev(div0, "class", "style-guide__fonts__primary__title");
    			add_location(div0, file$2, 8, 16, 263);
    			attr_dev(div1, "class", "style-guide__fonts__primary__desc");
    			add_location(div1, file$2, 11, 16, 384);
    			add_location(span1, file$2, 16, 24, 667);
    			add_location(span2, file$2, 19, 24, 766);
    			attr_dev(div2, "class", "style-guide__fonts__primary__body-text__paragraph regular");
    			add_location(div2, file$2, 15, 20, 571);
    			attr_dev(div3, "class", "style-guide__fonts__primary__body-text");
    			add_location(div3, file$2, 14, 16, 498);
    			add_location(span3, file$2, 26, 24, 1226);
    			add_location(span4, file$2, 29, 24, 1322);
    			attr_dev(div4, "class", "style-guide__fonts__primary__body-text__paragraph bold");
    			add_location(div4, file$2, 25, 20, 1133);
    			attr_dev(div5, "class", "style-guide__fonts__primary__body-text");
    			add_location(div5, file$2, 24, 16, 1060);
    			add_location(span5, file$2, 36, 24, 1787);
    			add_location(span6, file$2, 39, 24, 1888);
    			attr_dev(div6, "class", "style-guide__fonts__primary__body-text__paragraph extrabold");
    			add_location(div6, file$2, 35, 20, 1689);
    			attr_dev(div7, "class", "style-guide__fonts__primary__body-text");
    			add_location(div7, file$2, 34, 16, 1616);
    			attr_dev(div8, "class", "style-guide__fonts__primary");
    			add_location(div8, file$2, 7, 12, 205);
    			attr_dev(div9, "class", "style-guide__fonts__secondary__title");
    			add_location(div9, file$2, 46, 16, 2257);
    			attr_dev(div10, "class", "style-guide__fonts__secondary__desc");
    			add_location(div10, file$2, 49, 16, 2380);
    			add_location(span7, file$2, 54, 24, 2664);
    			add_location(span8, file$2, 57, 24, 2763);
    			attr_dev(div11, "class", "style-guide__fonts__primary__body-text__paragraph regular");
    			add_location(div11, file$2, 53, 20, 2568);
    			attr_dev(div12, "class", "style-guide__fonts__primary__body-text");
    			add_location(div12, file$2, 52, 16, 2495);
    			add_location(span9, file$2, 64, 24, 3223);
    			add_location(span10, file$2, 67, 24, 3319);
    			attr_dev(div13, "class", "style-guide__fonts__primary__body-text__paragraph bold");
    			add_location(div13, file$2, 63, 20, 3130);
    			attr_dev(div14, "class", "style-guide__fonts__primary__body-text");
    			add_location(div14, file$2, 62, 16, 3057);
    			add_location(span11, file$2, 74, 24, 3784);
    			add_location(span12, file$2, 77, 24, 3885);
    			attr_dev(div15, "class", "style-guide__fonts__primary__body-text__paragraph extrabold");
    			add_location(div15, file$2, 73, 20, 3686);
    			attr_dev(div16, "class", "style-guide__fonts__primary__body-text");
    			add_location(div16, file$2, 72, 16, 3613);
    			attr_dev(div17, "class", "style-guide__fonts__secondary");
    			add_location(div17, file$2, 45, 12, 2197);
    			add_location(h1, file$2, 84, 16, 4254);
    			add_location(h2, file$2, 85, 16, 4291);
    			add_location(h3, file$2, 86, 16, 4328);
    			add_location(h4, file$2, 87, 16, 4365);
    			add_location(h5, file$2, 88, 16, 4402);
    			add_location(h6, file$2, 89, 16, 4439);
    			attr_dev(div18, "class", "style-guide__fonts__headlines");
    			add_location(div18, file$2, 83, 12, 4194);
    			attr_dev(div19, "class", "style-guide__fonts__container");
    			add_location(div19, file$2, 5, 8, 96);
    			attr_dev(div20, "class", "style-guide__fonts");
    			add_location(div20, file$2, 4, 4, 55);
    			attr_dev(div21, "class", "style-guide__row");
    			add_location(div21, file$2, 3, 0, 20);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Fonts",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Buttons.svelte generated by Svelte v3.38.2 */

    const file$1 = "src/Buttons.svelte";

    function create_fragment$1(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let div0;
    	let span0;
    	let t1;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let button2;
    	let t7;
    	let div1;
    	let span1;
    	let t9;
    	let br;
    	let t10;
    	let ul0;
    	let li0;
    	let a0;
    	let i0;
    	let t11;
    	let li1;
    	let a1;
    	let i1;
    	let t12;
    	let li2;
    	let a2;
    	let i2;
    	let t13;
    	let li3;
    	let a3;
    	let i3;
    	let t14;
    	let ul1;
    	let li4;
    	let a4;
    	let i4;
    	let t15;
    	let li5;
    	let a5;
    	let i5;
    	let t16;
    	let li6;
    	let a6;
    	let i6;
    	let t17;
    	let li7;
    	let a7;
    	let i7;
    	let t18;
    	let ul2;
    	let li8;
    	let a8;
    	let i8;
    	let t19;
    	let li9;
    	let a9;
    	let i9;
    	let t20;
    	let li10;
    	let a10;
    	let i10;
    	let t21;
    	let li11;
    	let a11;
    	let i11;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "BUTTONS";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "1";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "2";
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "3";
    			t7 = space();
    			div1 = element("div");
    			span1 = element("span");
    			span1.textContent = "ICONS";
    			t9 = space();
    			br = element("br");
    			t10 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			i0 = element("i");
    			t11 = space();
    			li1 = element("li");
    			a1 = element("a");
    			i1 = element("i");
    			t12 = space();
    			li2 = element("li");
    			a2 = element("a");
    			i2 = element("i");
    			t13 = space();
    			li3 = element("li");
    			a3 = element("a");
    			i3 = element("i");
    			t14 = space();
    			ul1 = element("ul");
    			li4 = element("li");
    			a4 = element("a");
    			i4 = element("i");
    			t15 = space();
    			li5 = element("li");
    			a5 = element("a");
    			i5 = element("i");
    			t16 = space();
    			li6 = element("li");
    			a6 = element("a");
    			i6 = element("i");
    			t17 = space();
    			li7 = element("li");
    			a7 = element("a");
    			i7 = element("i");
    			t18 = space();
    			ul2 = element("ul");
    			li8 = element("li");
    			a8 = element("a");
    			i8 = element("i");
    			t19 = space();
    			li9 = element("li");
    			a9 = element("a");
    			i9 = element("i");
    			t20 = space();
    			li10 = element("li");
    			a10 = element("a");
    			i10 = element("i");
    			t21 = space();
    			li11 = element("li");
    			a11 = element("a");
    			i11 = element("i");
    			attr_dev(span0, "class", "title-section");
    			add_location(span0, file$1, 7, 16, 239);
    			add_location(button0, file$1, 8, 16, 298);
    			add_location(button1, file$1, 9, 16, 333);
    			add_location(button2, file$1, 10, 16, 368);
    			attr_dev(div0, "class", "style-guide__buttons__left");
    			add_location(div0, file$1, 6, 12, 182);
    			attr_dev(span1, "class", "title-section");
    			add_location(span1, file$1, 13, 16, 476);
    			add_location(br, file$1, 14, 16, 533);
    			attr_dev(i0, "class", "fa fa-instagram");
    			add_location(i0, file$1, 18, 29, 699);
    			attr_dev(a0, "href", "https://www.instagram.com/");
    			add_location(a0, file$1, 17, 24, 633);
    			add_location(li0, file$1, 16, 20, 604);
    			attr_dev(i1, "class", "fa fa-twitter");
    			add_location(i1, file$1, 23, 29, 893);
    			attr_dev(a1, "href", "https://twitter.com/");
    			add_location(a1, file$1, 22, 24, 833);
    			add_location(li1, file$1, 21, 20, 804);
    			attr_dev(i2, "class", "fa fa-linkedin");
    			add_location(i2, file$1, 28, 29, 1090);
    			attr_dev(a2, "href", "https://www.linkedin.com/");
    			add_location(a2, file$1, 27, 24, 1025);
    			add_location(li2, file$1, 26, 20, 996);
    			attr_dev(i3, "class", "fa fa-github");
    			add_location(i3, file$1, 33, 29, 1282);
    			attr_dev(a3, "href", "https://github.com/");
    			add_location(a3, file$1, 32, 24, 1223);
    			add_location(li3, file$1, 31, 20, 1194);
    			attr_dev(ul0, "class", "jca-social-icons");
    			add_location(ul0, file$1, 15, 16, 554);
    			attr_dev(i4, "class", "fa fa-instagram");
    			add_location(i4, file$1, 40, 29, 1560);
    			attr_dev(a4, "href", "https://www.instagram.com/");
    			add_location(a4, file$1, 39, 24, 1494);
    			add_location(li4, file$1, 38, 20, 1465);
    			attr_dev(i5, "class", "fa fa-twitter");
    			add_location(i5, file$1, 45, 29, 1754);
    			attr_dev(a5, "href", "https://twitter.com/");
    			add_location(a5, file$1, 44, 24, 1694);
    			add_location(li5, file$1, 43, 20, 1665);
    			attr_dev(i6, "class", "fa fa-linkedin");
    			add_location(i6, file$1, 50, 29, 1951);
    			attr_dev(a6, "href", "https://www.linkedin.com/");
    			add_location(a6, file$1, 49, 24, 1886);
    			add_location(li6, file$1, 48, 20, 1857);
    			attr_dev(i7, "class", "fa fa-github");
    			add_location(i7, file$1, 55, 29, 2143);
    			attr_dev(a7, "href", "https://github.com/");
    			add_location(a7, file$1, 54, 24, 2084);
    			add_location(li7, file$1, 53, 20, 2055);
    			attr_dev(ul1, "class", "jca-social-icons medium-icons");
    			add_location(ul1, file$1, 37, 16, 1402);
    			attr_dev(i8, "class", "fa fa-instagram");
    			add_location(i8, file$1, 62, 29, 2420);
    			attr_dev(a8, "href", "https://www.instagram.com/");
    			add_location(a8, file$1, 61, 24, 2354);
    			add_location(li8, file$1, 60, 20, 2325);
    			attr_dev(i9, "class", "fa fa-twitter");
    			add_location(i9, file$1, 67, 29, 2614);
    			attr_dev(a9, "href", "https://twitter.com/");
    			add_location(a9, file$1, 66, 24, 2554);
    			add_location(li9, file$1, 65, 20, 2525);
    			attr_dev(i10, "class", "fa fa-linkedin");
    			add_location(i10, file$1, 72, 29, 2811);
    			attr_dev(a10, "href", "https://www.linkedin.com/");
    			add_location(a10, file$1, 71, 24, 2746);
    			add_location(li10, file$1, 70, 20, 2717);
    			attr_dev(i11, "class", "fa fa-github");
    			add_location(i11, file$1, 77, 29, 3003);
    			attr_dev(a11, "href", "https://github.com/");
    			add_location(a11, file$1, 76, 24, 2944);
    			add_location(li11, file$1, 75, 20, 2915);
    			attr_dev(ul2, "class", "jca-social-icons small-icons");
    			add_location(ul2, file$1, 59, 16, 2263);
    			attr_dev(div1, "class", "style-guide__buttons__right");
    			add_location(div1, file$1, 12, 12, 418);
    			attr_dev(div2, "class", "style-guide__buttons__container");
    			add_location(div2, file$1, 5, 8, 124);
    			attr_dev(div3, "class", "style-guide__buttons");
    			add_location(div3, file$1, 4, 4, 81);
    			attr_dev(div4, "class", "style-guide__row border-bottom border-top ");
    			add_location(div4, file$1, 3, 0, 20);
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
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(div0, t5);
    			append_dev(div0, button2);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			append_dev(div1, span1);
    			append_dev(div1, t9);
    			append_dev(div1, br);
    			append_dev(div1, t10);
    			append_dev(div1, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(a0, i0);
    			append_dev(ul0, t11);
    			append_dev(ul0, li1);
    			append_dev(li1, a1);
    			append_dev(a1, i1);
    			append_dev(ul0, t12);
    			append_dev(ul0, li2);
    			append_dev(li2, a2);
    			append_dev(a2, i2);
    			append_dev(ul0, t13);
    			append_dev(ul0, li3);
    			append_dev(li3, a3);
    			append_dev(a3, i3);
    			append_dev(div1, t14);
    			append_dev(div1, ul1);
    			append_dev(ul1, li4);
    			append_dev(li4, a4);
    			append_dev(a4, i4);
    			append_dev(ul1, t15);
    			append_dev(ul1, li5);
    			append_dev(li5, a5);
    			append_dev(a5, i5);
    			append_dev(ul1, t16);
    			append_dev(ul1, li6);
    			append_dev(li6, a6);
    			append_dev(a6, i6);
    			append_dev(ul1, t17);
    			append_dev(ul1, li7);
    			append_dev(li7, a7);
    			append_dev(a7, i7);
    			append_dev(div1, t18);
    			append_dev(div1, ul2);
    			append_dev(ul2, li8);
    			append_dev(li8, a8);
    			append_dev(a8, i8);
    			append_dev(ul2, t19);
    			append_dev(ul2, li9);
    			append_dev(li9, a9);
    			append_dev(a9, i9);
    			append_dev(ul2, t20);
    			append_dev(ul2, li10);
    			append_dev(li10, a10);
    			append_dev(a10, i10);
    			append_dev(ul2, t21);
    			append_dev(ul2, li11);
    			append_dev(li11, a11);
    			append_dev(a11, i11);
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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Buttons",
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
    	let current;
    	logos = new Logos({ $$inline: true });
    	colors = new Colors({ $$inline: true });
    	fonts = new Fonts({ $$inline: true });
    	buttons = new Buttons({ $$inline: true });

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
    			attr_dev(div0, "class", "style-guide__container");
    			add_location(div0, file, 9, 2, 210);
    			attr_dev(div1, "class", "style-guide");
    			add_location(div1, file, 8, 1, 182);
    			add_location(main, file, 7, 0, 174);
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
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(logos.$$.fragment, local);
    			transition_in(colors.$$.fragment, local);
    			transition_in(fonts.$$.fragment, local);
    			transition_in(buttons.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(logos.$$.fragment, local);
    			transition_out(colors.$$.fragment, local);
    			transition_out(fonts.$$.fragment, local);
    			transition_out(buttons.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(logos);
    			destroy_component(colors);
    			destroy_component(fonts);
    			destroy_component(buttons);
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

    	$$self.$capture_state = () => ({ Logos, Colors, Fonts, Buttons });
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
