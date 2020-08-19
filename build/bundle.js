
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.24.1 */

    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    // (47:19) {#if userObject}
    function create_if_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Sign Out";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-secondary");
    			add_location(button, file, 46, 35, 1214);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*signOut*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(47:19) {#if userObject}",
    		ctx
    	});

    	return block;
    }

    // (111:1) {:catch error}
    function create_catch_block(ctx) {
    	let t0;
    	let t1_value = /*error*/ ctx[29] + "";
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("Error! ");
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*authPromise*/ 2 && t1_value !== (t1_value = /*error*/ ctx[29] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(111:1) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (50:32) {:then _}
    function create_then_block(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (!/*userObject*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(50:32) {:then _}",
    		ctx
    	});

    	return block;
    }

    // (63:2) {:else}
    function create_else_block(ctx) {
    	let div7;
    	let div0;
    	let t0;
    	let t1_value = /*userObject*/ ctx[0].username + "";
    	let t1;
    	let t2;
    	let div5;
    	let h5;
    	let t4;
    	let div2;
    	let div1;
    	let span0;
    	let t6;
    	let input;
    	let t7;
    	let div4;
    	let div3;
    	let span1;
    	let t9;
    	let textarea;
    	let t10;
    	let button;
    	let t12;
    	let div6;
    	let img0;
    	let img0_src_value;
    	let t13;
    	let svg;
    	let defs;
    	let radialGradient;
    	let stop0;
    	let stop1;
    	let stop2;
    	let stop3;
    	let linearGradient0;
    	let stop4;
    	let stop5;
    	let linearGradient1;
    	let stop6;
    	let stop7;
    	let stop8;
    	let stop9;
    	let linearGradient2;
    	let stop10;
    	let stop11;
    	let stop12;
    	let stop13;
    	let linearGradient3;
    	let stop14;
    	let stop15;
    	let stop16;
    	let stop17;
    	let linearGradient4;
    	let stop18;
    	let stop19;
    	let stop20;
    	let stop21;
    	let linearGradient5;
    	let stop22;
    	let stop23;
    	let stop24;
    	let stop25;
    	let stop26;
    	let stop27;
    	let g1;
    	let path0;
    	let g0;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let path5;
    	let path6;
    	let path7;
    	let t14;
    	let img1;
    	let img1_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div0 = element("div");
    			t0 = text("Hoş Geldin Sevgili ");
    			t1 = text(t1_value);
    			t2 = space();
    			div5 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Tarihe Bir Not Bırakma Zamanı";
    			t4 = space();
    			div2 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			span0.textContent = "Başlık";
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			div4 = element("div");
    			div3 = element("div");
    			span1 = element("span");
    			span1.textContent = "İçerik";
    			t9 = space();
    			textarea = element("textarea");
    			t10 = space();
    			button = element("button");
    			button.textContent = "Not Ekle";
    			t12 = space();
    			div6 = element("div");
    			img0 = element("img");
    			t13 = space();
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			radialGradient = svg_element("radialGradient");
    			stop0 = svg_element("stop");
    			stop1 = svg_element("stop");
    			stop2 = svg_element("stop");
    			stop3 = svg_element("stop");
    			linearGradient0 = svg_element("linearGradient");
    			stop4 = svg_element("stop");
    			stop5 = svg_element("stop");
    			linearGradient1 = svg_element("linearGradient");
    			stop6 = svg_element("stop");
    			stop7 = svg_element("stop");
    			stop8 = svg_element("stop");
    			stop9 = svg_element("stop");
    			linearGradient2 = svg_element("linearGradient");
    			stop10 = svg_element("stop");
    			stop11 = svg_element("stop");
    			stop12 = svg_element("stop");
    			stop13 = svg_element("stop");
    			linearGradient3 = svg_element("linearGradient");
    			stop14 = svg_element("stop");
    			stop15 = svg_element("stop");
    			stop16 = svg_element("stop");
    			stop17 = svg_element("stop");
    			linearGradient4 = svg_element("linearGradient");
    			stop18 = svg_element("stop");
    			stop19 = svg_element("stop");
    			stop20 = svg_element("stop");
    			stop21 = svg_element("stop");
    			linearGradient5 = svg_element("linearGradient");
    			stop22 = svg_element("stop");
    			stop23 = svg_element("stop");
    			stop24 = svg_element("stop");
    			stop25 = svg_element("stop");
    			stop26 = svg_element("stop");
    			stop27 = svg_element("stop");
    			g1 = svg_element("g");
    			path0 = svg_element("path");
    			g0 = svg_element("g");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			t14 = space();
    			img1 = element("img");
    			attr_dev(div0, "class", "card-header");
    			add_location(div0, file, 64, 6, 1930);
    			attr_dev(h5, "class", "card-title");
    			add_location(h5, file, 68, 8, 2057);
    			attr_dev(span0, "class", "input-group-text");
    			add_location(span0, file, 76, 9, 2257);
    			attr_dev(div1, "class", "input-group-prepend");
    			add_location(div1, file, 75, 7, 2214);
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", "Başlık");
    			attr_dev(input, "id", "Baslik");
    			attr_dev(input, "type", "text");
    			add_location(input, file, 79, 6, 2331);
    			set_style(div2, "margin-bottom", "20px");
    			attr_dev(div2, "class", "input-group");
    			add_location(div2, file, 74, 5, 2153);
    			attr_dev(span1, "class", "input-group-text");
    			add_location(span1, file, 84, 10, 2557);
    			attr_dev(div3, "class", "input-group-prepend");
    			add_location(div3, file, 83, 8, 2513);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "id", "icerik");
    			attr_dev(textarea, "placeholder", "İçerik");
    			add_location(textarea, file, 87, 6, 2632);
    			set_style(div4, "margin-bottom", "20px");
    			attr_dev(div4, "class", "input-group");
    			add_location(div4, file, 82, 5, 2451);
    			set_style(button, "width", "-webkit-fill-available");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file, 92, 5, 2771);
    			attr_dev(div5, "class", "card-body");
    			add_location(div5, file, 67, 6, 2025);
    			if (img0.src !== (img0_src_value = "https://img.icons8.com/fluent/48/000000/hand-with-pen.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "write");
    			add_location(img0, file, 97, 5, 2966);
    			attr_dev(stop0, "offset", "0");
    			attr_dev(stop0, "stop-color", "#afeeff");
    			add_location(stop0, file, 98, 235, 3283);
    			attr_dev(stop1, "offset", "0.193");
    			attr_dev(stop1, "stop-color", "#bbf1ff");
    			add_location(stop1, file, 98, 280, 3328);
    			attr_dev(stop2, "offset", "0.703");
    			attr_dev(stop2, "stop-color", "#d7f8ff");
    			add_location(stop2, file, 98, 329, 3377);
    			attr_dev(stop3, "offset", "1");
    			attr_dev(stop3, "stop-color", "#e1faff");
    			add_location(stop3, file, 98, 378, 3426);
    			attr_dev(radialGradient, "cx", "86");
    			attr_dev(radialGradient, "cy", "86");
    			attr_dev(radialGradient, "r", "73.79606");
    			attr_dev(radialGradient, "gradientUnits", "userSpaceOnUse");
    			attr_dev(radialGradient, "id", "color-1_119436_gr1");
    			add_location(radialGradient, file, 98, 135, 3183);
    			attr_dev(stop4, "offset", "0");
    			attr_dev(stop4, "stop-color", "#ffce76");
    			add_location(stop4, file, 98, 554, 3602);
    			attr_dev(stop5, "offset", "1");
    			attr_dev(stop5, "stop-color", "#ffcca0");
    			add_location(stop5, file, 98, 599, 3647);
    			attr_dev(linearGradient0, "x1", "34.9375");
    			attr_dev(linearGradient0, "y1", "86");
    			attr_dev(linearGradient0, "x2", "142.4375");
    			attr_dev(linearGradient0, "y2", "86");
    			attr_dev(linearGradient0, "gradientUnits", "userSpaceOnUse");
    			attr_dev(linearGradient0, "id", "color-2_119436_gr2");
    			add_location(linearGradient0, file, 98, 440, 3488);
    			attr_dev(stop6, "offset", "0");
    			attr_dev(stop6, "stop-color", "#ff8b67");
    			add_location(stop6, file, 98, 785, 3833);
    			attr_dev(stop7, "offset", "0.847");
    			attr_dev(stop7, "stop-color", "#ffa76a");
    			add_location(stop7, file, 98, 830, 3878);
    			attr_dev(stop8, "offset", "1");
    			attr_dev(stop8, "stop-color", "#ffad6b");
    			add_location(stop8, file, 98, 879, 3927);
    			attr_dev(stop9, "offset", "1");
    			attr_dev(stop9, "stop-color", "#ffad6b");
    			add_location(stop9, file, 98, 924, 3972);
    			attr_dev(linearGradient1, "x1", "88.6875");
    			attr_dev(linearGradient1, "y1", "226.524");
    			attr_dev(linearGradient1, "x2", "88.6875");
    			attr_dev(linearGradient1, "y2", "56.53694");
    			attr_dev(linearGradient1, "gradientUnits", "userSpaceOnUse");
    			attr_dev(linearGradient1, "id", "color-3_119436_gr3");
    			add_location(linearGradient1, file, 98, 661, 3709);
    			attr_dev(stop10, "offset", "0");
    			attr_dev(stop10, "stop-color", "#ff8b67");
    			add_location(stop10, file, 98, 1102, 4150);
    			attr_dev(stop11, "offset", "0.847");
    			attr_dev(stop11, "stop-color", "#ffa76a");
    			add_location(stop11, file, 98, 1147, 4195);
    			attr_dev(stop12, "offset", "1");
    			attr_dev(stop12, "stop-color", "#ffad6b");
    			add_location(stop12, file, 98, 1196, 4244);
    			attr_dev(stop13, "offset", "1");
    			attr_dev(stop13, "stop-color", "#ffad6b");
    			add_location(stop13, file, 98, 1241, 4289);
    			attr_dev(linearGradient2, "x1", "43");
    			attr_dev(linearGradient2, "y1", "147.8125");
    			attr_dev(linearGradient2, "x2", "43");
    			attr_dev(linearGradient2, "y2", "-27.79681");
    			attr_dev(linearGradient2, "gradientUnits", "userSpaceOnUse");
    			attr_dev(linearGradient2, "id", "color-4_119436_gr4");
    			add_location(linearGradient2, file, 98, 986, 4034);
    			attr_dev(stop14, "offset", "0");
    			attr_dev(stop14, "stop-color", "#ff8b67");
    			add_location(stop14, file, 98, 1433, 4481);
    			attr_dev(stop15, "offset", "0.847");
    			attr_dev(stop15, "stop-color", "#ffa76a");
    			add_location(stop15, file, 98, 1478, 4526);
    			attr_dev(stop16, "offset", "1");
    			attr_dev(stop16, "stop-color", "#ffad6b");
    			add_location(stop16, file, 98, 1527, 4575);
    			attr_dev(stop17, "offset", "1");
    			attr_dev(stop17, "stop-color", "#ffad6b");
    			add_location(stop17, file, 98, 1572, 4620);
    			attr_dev(linearGradient3, "x1", "114.21875");
    			attr_dev(linearGradient3, "y1", "129.27681");
    			attr_dev(linearGradient3, "x2", "114.21875");
    			attr_dev(linearGradient3, "y2", "67.60406");
    			attr_dev(linearGradient3, "gradientUnits", "userSpaceOnUse");
    			attr_dev(linearGradient3, "id", "color-5_119436_gr5");
    			add_location(linearGradient3, file, 98, 1303, 4351);
    			attr_dev(stop18, "offset", "0");
    			attr_dev(stop18, "stop-color", "#ff8b67");
    			add_location(stop18, file, 98, 1760, 4808);
    			attr_dev(stop19, "offset", "0.847");
    			attr_dev(stop19, "stop-color", "#ffa76a");
    			add_location(stop19, file, 98, 1805, 4853);
    			attr_dev(stop20, "offset", "1");
    			attr_dev(stop20, "stop-color", "#ffad6b");
    			add_location(stop20, file, 98, 1854, 4902);
    			attr_dev(stop21, "offset", "1");
    			attr_dev(stop21, "stop-color", "#ffad6b");
    			add_location(stop21, file, 98, 1899, 4947);
    			attr_dev(linearGradient4, "x1", "98.09375");
    			attr_dev(linearGradient4, "y1", "120.443");
    			attr_dev(linearGradient4, "x2", "98.09375");
    			attr_dev(linearGradient4, "y2", "85.99731");
    			attr_dev(linearGradient4, "gradientUnits", "userSpaceOnUse");
    			attr_dev(linearGradient4, "id", "color-6_119436_gr6");
    			add_location(linearGradient4, file, 98, 1634, 4682);
    			attr_dev(stop22, "offset", "0");
    			attr_dev(stop22, "stop-color", "#ff634d");
    			add_location(stop22, file, 98, 2082, 5130);
    			attr_dev(stop23, "offset", "0.204");
    			attr_dev(stop23, "stop-color", "#fe6464");
    			add_location(stop23, file, 98, 2127, 5175);
    			attr_dev(stop24, "offset", "0.521");
    			attr_dev(stop24, "stop-color", "#fc6581");
    			add_location(stop24, file, 98, 2176, 5224);
    			attr_dev(stop25, "offset", "0.794");
    			attr_dev(stop25, "stop-color", "#fa6694");
    			add_location(stop25, file, 98, 2225, 5273);
    			attr_dev(stop26, "offset", "0.989");
    			attr_dev(stop26, "stop-color", "#fa669a");
    			add_location(stop26, file, 98, 2274, 5322);
    			attr_dev(stop27, "offset", "1");
    			attr_dev(stop27, "stop-color", "#fa669a");
    			add_location(stop27, file, 98, 2323, 5371);
    			attr_dev(linearGradient5, "x1", "77.9375");
    			attr_dev(linearGradient5, "y1", "88.6875");
    			attr_dev(linearGradient5, "x2", "77.9375");
    			attr_dev(linearGradient5, "y2", "10.75");
    			attr_dev(linearGradient5, "gradientUnits", "userSpaceOnUse");
    			attr_dev(linearGradient5, "id", "color-7_119436_gr7");
    			add_location(linearGradient5, file, 98, 1961, 5009);
    			add_location(defs, file, 98, 129, 3177);
    			attr_dev(path0, "d", "M0,172v-172h172v172z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file, 98, 2674, 5722);
    			attr_dev(path1, "d", "M149.03263,122.73275c1.34375,2.41338 4.042,3.59319 6.80475,3.57975c4.70313,-0.0215 8.47369,3.98556 8.06788,8.76663c-0.35744,4.2355 -4.17638,7.35837 -8.428,7.35837h-26.47725v2.6875h-59.125h-21.5h-29.5625c-4.59562,0 -8.29362,-3.84581 -8.05175,-8.49519c0.22844,-4.36181 4.14144,-7.62981 8.50863,-7.62981h2.23063c3.26531,0 5.848,-2.91056 5.30244,-6.278c-0.43,-2.64181 -2.91325,-4.472 -5.59,-4.472h-13.14994c-4.59562,0 -8.29362,-3.84581 -8.05175,-8.49519c0.22844,-4.36181 4.14144,-7.62981 8.50863,-7.62981h17.01188c3.71144,0 6.71875,-3.00731 6.71875,-6.71875v0c0,-3.71144 -3.00731,-6.71875 -6.71875,-6.71875v0c-3.71144,0 -6.71875,-3.00731 -6.71875,-6.71875v0c0,-3.71144 3.00731,-6.71875 6.71875,-6.71875h22.84375v-18.8125h-20.15625c-5.36156,0 -9.67769,-4.48813 -9.39281,-9.9115c0.26606,-5.08744 4.83213,-8.901 9.92494,-8.901h19.62413v-10.75h64.5h16.125h22.03213c5.36156,0 9.67769,4.48813 9.39281,9.9115c-0.26606,5.08744 -4.83212,8.901 -9.92494,8.901h-6.71875c-5.36156,0 -9.67769,4.48813 -9.39281,9.9115c0.26606,5.08744 4.83212,8.901 9.92494,8.901h6.18662c4.77569,0 8.58388,4.15488 8.00338,9.04613c-0.48106,4.05544 -4.15488,6.91225 -8.2345,7.08156c-3.21694,0.13438 -5.70288,3.09869 -5.03638,6.46612c0.50525,2.54775 2.91056,4.28119 5.50669,4.28119h11.85456c5.36156,0 9.67769,4.48813 9.39281,9.9115c-0.26606,5.08744 -4.83212,8.901 -9.92494,8.901h-6.18662c-5.891,0 -10.30388,6.31562 -6.84238,12.54525zM6.71875,88.6875v0c3.71144,0 6.71875,-3.00731 6.71875,-6.71875v0c0,-3.71144 -3.00731,-6.71875 -6.71875,-6.71875v0c-3.71144,0 -6.71875,3.00731 -6.71875,6.71875v0c0,3.71144 3.00731,6.71875 6.71875,6.71875z");
    			attr_dev(path1, "fill", "url(#color-1_119436_gr1)");
    			add_location(path1, file, 98, 2727, 5775);
    			attr_dev(path2, "d", "M134.375,155.875h-91.375c-4.45319,0 -8.0625,-3.60931 -8.0625,-8.0625v-123.625c0,-4.45319 3.60931,-8.0625 8.0625,-8.0625h91.375c4.45319,0 8.0625,3.60931 8.0625,8.0625v123.625c0,4.45319 -3.60931,8.0625 -8.0625,8.0625z");
    			attr_dev(path2, "fill", "url(#color-2_119436_gr2)");
    			add_location(path2, file, 98, 4372, 7420);
    			attr_dev(path3, "d", "M134.375,139.75h-99.4375v-115.5625c0,-4.45319 3.60931,-8.0625 8.0625,-8.0625h91.375c4.45319,0 8.0625,3.60931 8.0625,8.0625v107.5c0,4.45319 -3.60931,8.0625 -8.0625,8.0625z");
    			attr_dev(path3, "fill", "url(#color-3_119436_gr3)");
    			add_location(path3, file, 98, 4637, 7685);
    			attr_dev(path4, "d", "M51.0625,139.75h-8.0625c-4.45319,0 -8.0625,3.60931 -8.0625,8.0625v0v-123.625c0,-4.45319 3.60931,-8.0625 8.0625,-8.0625h8.0625z");
    			attr_dev(path4, "fill", "url(#color-4_119436_gr4)");
    			add_location(path4, file, 98, 4857, 7905);
    			attr_dev(path5, "d", "M110.1875,106.15625v0c0,3.71144 3.00731,6.71875 6.71875,6.71875h5.375c3.71144,0 6.71875,3.00731 6.71875,6.71875v0c0,3.71144 -3.00731,6.71875 -6.71875,6.71875h-29.5625c-3.71144,0 -6.71875,3.00731 -6.71875,6.71875v0c0,3.71144 3.00731,6.71875 6.71875,6.71875h41.65625c4.45319,0 8.0625,-3.60931 8.0625,-8.0625v-32.25h-25.53125c-3.71144,0 -6.71875,3.00731 -6.71875,6.71875z");
    			attr_dev(path5, "fill", "url(#color-5_119436_gr5)");
    			add_location(path5, file, 98, 5033, 8081);
    			attr_dev(path6, "d", "M98.09375,99.4375c-3.71066,0 -6.71875,3.00809 -6.71875,6.71875c0,3.71066 3.00809,6.71875 6.71875,6.71875c3.71066,0 6.71875,-3.00809 6.71875,-6.71875c0,-3.71066 -3.00809,-6.71875 -6.71875,-6.71875z");
    			attr_dev(path6, "fill", "url(#color-6_119436_gr6)");
    			add_location(path6, file, 98, 5451, 8499);
    			attr_dev(path7, "d", "M87.58563,88.6875h-0.01613c-1.00513,0 -1.96994,-0.40044 -2.67944,-1.10994l-6.95256,-6.95256l-6.95256,6.95256c-0.7095,0.7095 -1.67431,1.10994 -2.67944,1.10994h-0.01612c-2.09356,0 -3.78938,-1.69581 -3.78938,-3.78938v-66.08562c0,-4.45319 3.60931,-8.0625 8.0625,-8.0625h10.75c4.45319,0 8.0625,3.60931 8.0625,8.0625v66.08562c0,2.09356 -1.69581,3.78938 -3.78937,3.78938z");
    			attr_dev(path7, "fill", "url(#color-7_119436_gr7)");
    			add_location(path7, file, 98, 5697, 8745);
    			add_location(g0, file, 98, 2724, 5772);
    			attr_dev(g1, "fill", "none");
    			attr_dev(g1, "fill-rule", "nonzero");
    			attr_dev(g1, "stroke", "none");
    			attr_dev(g1, "stroke-width", "1");
    			attr_dev(g1, "stroke-linecap", "butt");
    			attr_dev(g1, "stroke-linejoin", "miter");
    			attr_dev(g1, "stroke-miterlimit", "10");
    			attr_dev(g1, "stroke-dasharray", "");
    			attr_dev(g1, "stroke-dashoffset", "0");
    			attr_dev(g1, "font-family", "none");
    			attr_dev(g1, "font-weight", "none");
    			attr_dev(g1, "font-size", "none");
    			attr_dev(g1, "text-anchor", "none");
    			set_style(g1, "mix-blend-mode", "normal");
    			add_location(g1, file, 98, 2392, 5440);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "x", "0px");
    			attr_dev(svg, "y", "0px");
    			attr_dev(svg, "width", "48");
    			attr_dev(svg, "height", "48");
    			attr_dev(svg, "viewBox", "0 0 172 172");
    			set_style(svg, "fill", "#000000");
    			add_location(svg, file, 98, 5, 3053);
    			if (img1.src !== (img1_src_value = "https://img.icons8.com/emoji/48/000000/waving-hand-emoji.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "hello");
    			add_location(img1, file, 99, 5, 9179);
    			attr_dev(div6, "class", "card-footer text-muted");
    			add_location(div6, file, 95, 6, 2918);
    			attr_dev(div7, "class", "card text-center yazi svelte-1kmy4we");
    			add_location(div7, file, 63, 3, 1888);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div7, t2);
    			append_dev(div7, div5);
    			append_dev(div5, h5);
    			append_dev(div5, t4);
    			append_dev(div5, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(div2, t6);
    			append_dev(div2, input);
    			set_input_value(input, /*newPost*/ ctx[5]);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, span1);
    			append_dev(div4, t9);
    			append_dev(div4, textarea);
    			set_input_value(textarea, /*icerik*/ ctx[6]);
    			append_dev(div5, t10);
    			append_dev(div5, button);
    			append_dev(div7, t12);
    			append_dev(div7, div6);
    			append_dev(div6, img0);
    			append_dev(div6, t13);
    			append_dev(div6, svg);
    			append_dev(svg, defs);
    			append_dev(defs, radialGradient);
    			append_dev(radialGradient, stop0);
    			append_dev(radialGradient, stop1);
    			append_dev(radialGradient, stop2);
    			append_dev(radialGradient, stop3);
    			append_dev(defs, linearGradient0);
    			append_dev(linearGradient0, stop4);
    			append_dev(linearGradient0, stop5);
    			append_dev(defs, linearGradient1);
    			append_dev(linearGradient1, stop6);
    			append_dev(linearGradient1, stop7);
    			append_dev(linearGradient1, stop8);
    			append_dev(linearGradient1, stop9);
    			append_dev(defs, linearGradient2);
    			append_dev(linearGradient2, stop10);
    			append_dev(linearGradient2, stop11);
    			append_dev(linearGradient2, stop12);
    			append_dev(linearGradient2, stop13);
    			append_dev(defs, linearGradient3);
    			append_dev(linearGradient3, stop14);
    			append_dev(linearGradient3, stop15);
    			append_dev(linearGradient3, stop16);
    			append_dev(linearGradient3, stop17);
    			append_dev(defs, linearGradient4);
    			append_dev(linearGradient4, stop18);
    			append_dev(linearGradient4, stop19);
    			append_dev(linearGradient4, stop20);
    			append_dev(linearGradient4, stop21);
    			append_dev(defs, linearGradient5);
    			append_dev(linearGradient5, stop22);
    			append_dev(linearGradient5, stop23);
    			append_dev(linearGradient5, stop24);
    			append_dev(linearGradient5, stop25);
    			append_dev(linearGradient5, stop26);
    			append_dev(linearGradient5, stop27);
    			append_dev(svg, g1);
    			append_dev(g1, path0);
    			append_dev(g1, g0);
    			append_dev(g0, path1);
    			append_dev(g0, path2);
    			append_dev(g0, path3);
    			append_dev(g0, path4);
    			append_dev(g0, path5);
    			append_dev(g0, path6);
    			append_dev(g0, path7);
    			append_dev(div6, t14);
    			append_dev(div6, img1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[14]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[15]),
    					listen_dev(button, "click", /*addPost*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*userObject*/ 1 && t1_value !== (t1_value = /*userObject*/ ctx[0].username + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*newPost*/ 32 && input.value !== /*newPost*/ ctx[5]) {
    				set_input_value(input, /*newPost*/ ctx[5]);
    			}

    			if (dirty & /*icerik*/ 64) {
    				set_input_value(textarea, /*icerik*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(63:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (51:2) {#if !userObject}
    function create_if_block(ctx) {
    	let div;
    	let form;
    	let input0;
    	let t0;
    	let br0;
    	let t1;
    	let input1;
    	let t2;
    	let br1;
    	let t3;
    	let button0;
    	let t5;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			form = element("form");
    			input0 = element("input");
    			t0 = space();
    			br0 = element("br");
    			t1 = space();
    			input1 = element("input");
    			t2 = space();
    			br1 = element("br");
    			t3 = space();
    			button0 = element("button");
    			button0.textContent = "Sign Up";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "Sign In";
    			attr_dev(input0, "id", "username");
    			attr_dev(input0, "class", "signUpInput svelte-1kmy4we");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "name", "Ad Soyad");
    			attr_dev(input0, "placeholder", "Ad Soyad");
    			add_location(input0, file, 53, 2, 1457);
    			add_location(br0, file, 54, 2, 1576);
    			attr_dev(input1, "id", "password");
    			attr_dev(input1, "class", "signUpInput svelte-1kmy4we");
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "name", "sifre");
    			attr_dev(input1, "placeholder", "Sifre");
    			add_location(input1, file, 55, 2, 1583);
    			add_location(br1, file, 56, 2, 1698);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "signUpBtn svelte-1kmy4we");
    			add_location(button0, file, 57, 2, 1705);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "signUpBtn svelte-1kmy4we");
    			add_location(button1, file, 58, 2, 1782);
    			add_location(form, file, 52, 1, 1448);
    			attr_dev(div, "class", "signUpDiv svelte-1kmy4we");
    			add_location(div, file, 51, 1, 1423);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, form);
    			append_dev(form, input0);
    			set_input_value(input0, /*username*/ ctx[2]);
    			append_dev(form, t0);
    			append_dev(form, br0);
    			append_dev(form, t1);
    			append_dev(form, input1);
    			set_input_value(input1, /*password*/ ctx[3]);
    			append_dev(form, t2);
    			append_dev(form, br1);
    			append_dev(form, t3);
    			append_dev(form, button0);
    			append_dev(form, t5);
    			append_dev(form, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[12]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[13]),
    					listen_dev(button0, "click", /*signUp*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*signIn*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*username*/ 4 && input0.value !== /*username*/ ctx[2]) {
    				set_input_value(input0, /*username*/ ctx[2]);
    			}

    			if (dirty & /*password*/ 8 && input1.value !== /*password*/ ctx[3]) {
    				set_input_value(input1, /*password*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(51:2) {#if !userObject}",
    		ctx
    	});

    	return block;
    }

    // (50:21)  loading...{:then _}
    function create_pending_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("loading...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(50:21)  loading...{:then _}",
    		ctx
    	});

    	return block;
    }

    // (120:2) {#each posts as post}
    function create_each_block(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let h5;
    	let t0_value = /*post*/ ctx[25].item.newPost + "";
    	let t0;
    	let t1;
    	let h6;
    	let t2_value = /*post*/ ctx[25].item.newdate + "";
    	let t2;
    	let t3;
    	let p;
    	let t4_value = /*post*/ ctx[25].item.icerik + "";
    	let t4;
    	let t5;
    	let button;
    	let img;
    	let img_src_value;
    	let t6;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[16](/*post*/ ctx[25], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			t0 = text(t0_value);
    			t1 = space();
    			h6 = element("h6");
    			t2 = text(t2_value);
    			t3 = space();
    			p = element("p");
    			t4 = text(t4_value);
    			t5 = space();
    			button = element("button");
    			img = element("img");
    			t6 = space();
    			attr_dev(h5, "class", "card-title");
    			add_location(h5, file, 123, 7, 9527);
    			attr_dev(h6, "class", "card-subtitle mb-2 text-muted");
    			add_location(h6, file, 124, 7, 9582);
    			attr_dev(p, "class", "card-text");
    			add_location(p, file, 125, 4, 9653);
    			set_style(img, "width", "32px");
    			set_style(img, "height", "32px");
    			if (img.src !== (img_src_value = "https://img.icons8.com/color/48/000000/delete-forever.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "delete");
    			add_location(img, file, 129, 5, 9837);
    			attr_dev(button, "style", "background: none; border: none; width: 40px; height: 40px;}");
    			add_location(button, file, 128, 4, 9714);
    			attr_dev(div0, "class", "card-body");
    			add_location(div0, file, 122, 5, 9496);
    			attr_dev(div1, "class", "card svelte-1kmy4we");
    			add_location(div1, file, 121, 3, 9471);
    			attr_dev(div2, "class", "col-md");
    			add_location(div2, file, 120, 4, 9447);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h5);
    			append_dev(h5, t0);
    			append_dev(div0, t1);
    			append_dev(div0, h6);
    			append_dev(h6, t2);
    			append_dev(div0, t3);
    			append_dev(div0, p);
    			append_dev(p, t4);
    			append_dev(div0, t5);
    			append_dev(div0, button);
    			append_dev(button, img);
    			append_dev(div2, t6);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*posts*/ 16 && t0_value !== (t0_value = /*post*/ ctx[25].item.newPost + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*posts*/ 16 && t2_value !== (t2_value = /*post*/ ctx[25].item.newdate + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*posts*/ 16 && t4_value !== (t4_value = /*post*/ ctx[25].item.icerik + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(120:2) {#each posts as post}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h2;
    	let t1;
    	let t2;
    	let br;
    	let t3;
    	let h3;
    	let t5;
    	let promise;
    	let t6;
    	let div1;
    	let div0;
    	let if_block = /*userObject*/ ctx[0] && create_if_block_1(ctx);

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 28,
    		error: 29
    	};

    	handle_promise(promise = /*authPromise*/ ctx[1], info);
    	let each_value = /*posts*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			h2 = element("h2");
    			h2.textContent = "Kalk Yap";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			br = element("br");
    			t3 = space();
    			h3 = element("h3");
    			h3.textContent = "Yapman için her şeyi burada bulacaksın!";
    			t5 = space();
    			info.block.c();
    			t6 = space();
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h2, file, 46, 1, 1180);
    			add_location(br, file, 47, 1, 1305);
    			add_location(h3, file, 48, 1, 1311);
    			attr_dev(main, "class", "svelte-1kmy4we");
    			add_location(main, file, 45, 0, 1172);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file, 118, 2, 9401);
    			attr_dev(div1, "class", "container blog svelte-1kmy4we");
    			add_location(div1, file, 117, 0, 9370);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h2);
    			append_dev(main, t1);
    			if (if_block) if_block.m(main, null);
    			append_dev(main, t2);
    			append_dev(main, br);
    			append_dev(main, t3);
    			append_dev(main, h3);
    			append_dev(main, t5);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = null;
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (/*userObject*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(main, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			info.ctx = ctx;

    			if (dirty & /*authPromise*/ 2 && promise !== (promise = /*authPromise*/ ctx[1]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[28] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}

    			if (dirty & /*deletePost, posts*/ 2064) {
    				each_value = /*posts*/ ctx[4];
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
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    			info.block.d();
    			info.token = null;
    			info = null;
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
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

    const databaseName = "posts";

    function instance($$self, $$props, $$invalidate) {
    	let userObject = null;
    	const userBase = window.userbase;

    	let authPromise = userBase.init({
    		appId: "4bef59b3-7749-417d-92aa-b69056492dab"
    	}).then(({ user }) => $$invalidate(0, userObject = user));

    	let username, password;
    	var dateObj = new Date();
    	var month = dateObj.getUTCMonth() + 1; //months from 1-12
    	var day = dateObj.getUTCDate();
    	var year = dateObj.getUTCFullYear();
    	let newdate = day + "/" + month + "/" + year;
    	const signIn = () => $$invalidate(1, authPromise = userBase.signIn({ username, password }).then(user => $$invalidate(0, userObject = user)));
    	const signUp = () => $$invalidate(1, authPromise = userBase.signUp({ username, password }).then(user => $$invalidate(0, userObject = user)));
    	const signOut = () => $$invalidate(1, authPromise = userBase.signOut().then(() => $$invalidate(0, userObject = null)));
    	let postPromise;
    	let posts = [], newPost, icerik;

    	function changeHandler(items) {
    		$$invalidate(4, posts = items);
    	}

    	

    	function addPost() {
    		userBase.insertItem({
    			databaseName,
    			item: { newPost, icerik, newdate }
    		});

    		$$invalidate(5, newPost = "");
    		$$invalidate(6, icerik = "");
    	}

    	function deletePost(itemId) {
    		postPromise = userbase.deleteItem({ databaseName, itemId });
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(2, username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(3, password);
    	}

    	function input_input_handler() {
    		newPost = this.value;
    		$$invalidate(5, newPost);
    	}

    	function textarea_input_handler() {
    		icerik = this.value;
    		$$invalidate(6, icerik);
    	}

    	const click_handler = post => deletePost(post.itemId);

    	$$self.$capture_state = () => ({
    		userObject,
    		userBase,
    		authPromise,
    		username,
    		password,
    		dateObj,
    		month,
    		day,
    		year,
    		newdate,
    		signIn,
    		signUp,
    		signOut,
    		postPromise,
    		posts,
    		newPost,
    		icerik,
    		databaseName,
    		changeHandler,
    		addPost,
    		deletePost
    	});

    	$$self.$inject_state = $$props => {
    		if ("userObject" in $$props) $$invalidate(0, userObject = $$props.userObject);
    		if ("authPromise" in $$props) $$invalidate(1, authPromise = $$props.authPromise);
    		if ("username" in $$props) $$invalidate(2, username = $$props.username);
    		if ("password" in $$props) $$invalidate(3, password = $$props.password);
    		if ("dateObj" in $$props) dateObj = $$props.dateObj;
    		if ("month" in $$props) month = $$props.month;
    		if ("day" in $$props) day = $$props.day;
    		if ("year" in $$props) year = $$props.year;
    		if ("newdate" in $$props) newdate = $$props.newdate;
    		if ("postPromise" in $$props) postPromise = $$props.postPromise;
    		if ("posts" in $$props) $$invalidate(4, posts = $$props.posts);
    		if ("newPost" in $$props) $$invalidate(5, newPost = $$props.newPost);
    		if ("icerik" in $$props) $$invalidate(6, icerik = $$props.icerik);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*userObject*/ 1) {
    			 if (userObject) userBase.openDatabase({ databaseName, changeHandler });
    		}
    	};

    	return [
    		userObject,
    		authPromise,
    		username,
    		password,
    		posts,
    		newPost,
    		icerik,
    		signIn,
    		signUp,
    		signOut,
    		addPost,
    		deletePost,
    		input0_input_handler,
    		input1_input_handler,
    		input_input_handler,
    		textarea_input_handler,
    		click_handler
    	];
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
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
