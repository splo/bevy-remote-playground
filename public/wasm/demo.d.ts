/* tslint:disable */
/* eslint-disable */
/** Returns a Promise that blocks until the `RemoteWasmPlugin` Bevy plugin initializes the bridge. */
export function getBridge(): Promise<BrpBridge>;

/** The root bridge object exposed by `getBridge()`. */
export interface BrpBridge {
    /** Remote methods for the main Bevy app. */
    main: BrpApp;
}

/**
 * The map from BRP method name strings to methods for a single app.
 * Keys use the original BRP method names (`'world.query'`, `'world.list_components+watch'`).
 */
export type BrpApp = {
    [method: string]: BrpMethod;
};

/** Either an instant or a watching method. */
// Uses `any` so that interfaces like `BuiltInBrpApp` (that have precise per-method generics)
// can satisfy the `Record<string, BrpMethod>` index signature constraint.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BrpMethod = InstantMethod<any, any> | WatchMethod<any, any>;

/** An instant (one-shot) BRP method with a callback and no-callback variants. */
export type InstantMethod<P, R> = InstantMethodNoCallback<P, R> & InstantMethodWithCallback<P, R>;

/**
 * An instant (one-shot) BRP method called without a callback.
 *
 * Returns a Promise that resolves with the result.
 */
export type InstantMethodNoCallback<P, R> = (params?: P) => Promise<R>;

/**
 * An instant (one-shot) BRP method called with a callback.
 *
 * Invokes `callback(result)` when the result arrives.
 */
export type InstantMethodWithCallback<P, R> = (params: P | undefined, callback: (result: R) => void) => Promise<void>;

/** A function that stops a stream when called. */
export type StopWatchingFn = () => void;

/**
 * A watching (streaming) BRP method. Streams results to `callback` on every change.
 *
 * Returns a Promise that resolves to a closer function used to stop the stream.
 */
export type WatchMethod<P, R> = (params: P, callback: (result: R) => void) => Promise<StopWatchingFn>;

/**
 * The built-in BRP method map for a single app.
 *
 * Keys are the verbatim BRP method names (e.g. `'world.get_components'`,
 * `'world.list_components+watch'`). Use bracket notation to call them:
 *
 * ```ts
 * const result = await app['world.query']({ data: { option: 'all' } });
 * const close  = await app['world.list_components+watch']({ entity: 42 }, callback);
 * ```
 *
 * To add custom methods use an intersection:
 * ```ts
 * type MyApp = BuiltInBrpApp & { 'my.method': InstantMethod<MyParams, MyResult> };
 * ```
 */
export interface BuiltInBrpApp extends BrpApp {
    /** Returns an OpenRPC discovery document. */
    'rpc.discover': InstantMethod<BrpRpcDiscoverParams, BrpRpcDiscoverResponse>;
    /** Lists all registered types as a JSON Schema-like document. */
    'registry.schema': InstantMethod<BrpRegistrySchemaParams, BrpRegistrySchemaResponse>;
    /** Despawns an entity with the given ID. */
    'world.despawn_entity': InstantMethod<BrpDespawnEntityParams, BrpDespawnEntityResponse>;
    /** Retrieves one or more components from the entity with the given ID. */
    'world.get_components': InstantMethod<BrpGetComponentsParams, BrpGetComponentsResponse>;
    /** Watches one or more components on an entity, streaming updates when they change or are removed. */
    'world.get_components+watch': WatchMethod<BrpGetComponentsParams, BrpGetComponentsWatchResponse>;
    /** Retrieves the value of a given resource. */
    'world.get_resources': InstantMethod<BrpGetResourcesParams, BrpGetResourcesResponse>;
    /** Adds one or more components to an entity. */
    'world.insert_components': InstantMethod<BrpInsertComponentsParams, BrpInsertComponentsResponse>;
    /** Inserts a resource into the world with a given value. */
    'world.insert_resources': InstantMethod<BrpInsertResourcesParams, BrpInsertResourcesResponse>;
    /** Returns a list of all type names of registered components in the system, or those on an entity when params are provided. */
    'world.list_components': InstantMethod<BrpListComponentsParams, BrpListComponentsResponse>;
    /** Watches for component additions and removals on an entity, streaming updates. */
    'world.list_components+watch': WatchMethod<BrpListComponentsParams, BrpListComponentsWatchResponse>;
    /** Returns a list of all type names of registered resources in the system. */
    'world.list_resources': InstantMethod<BrpListResourcesParams, BrpListResourcesResponse>;
    /** Mutates a single field inside an entity's component. */
    'world.mutate_components': InstantMethod<BrpMutateComponentsParams, BrpMutateComponentsResponse>;
    /** Mutates a single field inside a resource. */
    'world.mutate_resources': InstantMethod<BrpMutateResourcesParams, BrpMutateResourcesResponse>;
    /** Performs a query over components in the ECS, returning entities and component values that match. */
    'world.query': InstantMethod<BrpQueryParams, BrpQueryResponse>;
    /** Deletes one or more components from an entity. */
    'world.remove_components': InstantMethod<BrpRemoveComponentsParams, BrpRemoveComponentsResponse>;
    /** Removes the given resource from the world. */
    'world.remove_resources': InstantMethod<BrpRemoveResourcesParams, BrpRemoveResourcesResponse>;
    /** Assigns a new parent to one or more entities. */
    'world.reparent_entities': InstantMethod<BrpReparentEntitiesParams, BrpReparentEntitiesResponse>;
    /** Creates a new entity with the given components and responds with its ID. */
    'world.spawn_entity': InstantMethod<BrpSpawnEntityParams, BrpSpawnEntityResponse>;
    /** Triggers an event. */
    'world.trigger_event': InstantMethod<BrpTriggerEventParams, BrpTriggerEventResponse>;
}

/** The root bridge object pre-typed with all of Bevy's built-in Remote Protocol methods. */
export interface BuiltInBrpBridge extends BrpBridge {
    /** Remote methods for the main Bevy app. */
    main: BuiltInBrpApp;
}

/** Bevy entity identifier. Serialized as a u64 integer in JSON. */
export type Entity = number;

/** A type path string, e.g. `bevy_transform::components::transform::Transform`. */
export type TypePath = string;

export interface BrpGetComponentsParams {
    /** The ID of the entity from which components are to be requested. */
    entity: Entity;
    /** The full type paths of the component types to retrieve. */
    components: TypePath[];
    /** Fail on encountering an invalid component rather than skipping it. Defaults to false. */
    strict?: boolean;
}

/**
 * - Lenient (non-strict): `{ components, errors }` — per-component errors reported without failing the request.
 * - Strict: a plain map of component type path → value.
 */
export type BrpGetComponentsResponse =
{
    components: Record<TypePath, unknown>;
    errors: Record<TypePath, unknown>;
}
| Record<TypePath, unknown>;

export interface BrpQueryParams {
    /** The components to select. */
    data: {
        /** Full type paths of required components to fetch. */
        components?: TypePath[];
        /** Full type paths of components to fetch optionally, or `"all"` for every reflectable component. */
        option?: "all" | TypePath[];
        /** Full type paths of components to check for presence only (boolean result). */
        has?: TypePath[];
    };
    /** An optional filter that specifies which entities to include or exclude from the results. */
    filter?: {
        /** Entities that have any of these components are excluded from results. */
        without?: TypePath[];
        /** Only entities that have all of these components are included in results. */
        with?: TypePath[];
    };
    /** Fail on encountering an invalid component rather than skipping it. Defaults to false. */
    strict?: boolean;
}

export type BrpQueryResponse = {
    /** The ID of the entity that matched. */
    entity: Entity;
    /** The serialized values of the requested components. */
    components: Record<TypePath, unknown>;
    /** Boolean presence results for `has` components. Omitted if empty. */
    has?: Record<TypePath, boolean>;
}[];

export interface BrpSpawnEntityParams {
    /** A map from each component's full type path to its serialized value. */
    components: Record<TypePath, unknown>;
}

export interface BrpSpawnEntityResponse {
    /** The ID of the newly spawned entity. */
    entity: Entity;
}

export interface BrpDespawnEntityParams {
    /** The ID of the entity to despawn. */
    entity: Entity;
}

export type BrpDespawnEntityResponse = null;

export interface BrpRemoveComponentsParams {
    /** The ID of the entity from which components are to be removed. */
    entity: Entity;
    /** The full type paths of the components to remove. */
    components: TypePath[];
}

export type BrpRemoveComponentsResponse = null;

export interface BrpInsertComponentsParams {
    /** The ID of the entity that components are to be added to. */
    entity: Entity;
    /** A map from each component's full type path to its serialized value. */
    components: Record<TypePath, unknown>;
}

export type BrpInsertComponentsResponse = null;

export interface BrpMutateComponentsParams {
    /** The entity of the component to mutate. */
    entity: Entity;
    /** The full type path of the component to mutate. */
    component: TypePath;
    /** The path of the field within the component. */
    path: string;
    /** The value to insert at `path`. */
    value: unknown;
}

export type BrpMutateComponentsResponse = null;

export interface BrpReparentEntitiesParams {
    /** The IDs of the entities that are to become the new children of `parent`. */
    entities: Entity[];
    /**
     * The ID of the entity that will become the new parent of `entities`.
     * If absent, entities are removed from all parents.
     */
    parent?: Entity;
}

export type BrpReparentEntitiesResponse = null;

/** Omit entirely (pass `undefined`) to list all registered component type names. */
export interface BrpListComponentsParams {
    /** The entity to query. */
    entity: Entity;
}

export type BrpListComponentsResponse = TypePath[];

/**
 * Per streaming update.
 * - Lenient: `{ components, removed, errors }`
 * - Strict: `{ components, removed }`
 */
export type BrpGetComponentsWatchResponse =
{
    /** Components that were added or changed in the last tick. */
    components: Record<TypePath, unknown>;
    /** Components that were removed in the last tick. */
    removed: TypePath[];
    /** Unsuccessful components with their errors. */
    errors: Record<TypePath, unknown>;
} | {
    /** Components that were added or changed in the last tick. */
    components: Record<TypePath, unknown>;
    /** Components that were removed in the last tick. */
    removed: TypePath[];
};

export interface BrpListComponentsWatchResponse {
    added: TypePath[];
    removed: TypePath[];
}

export interface BrpGetResourcesParams {
    /** The full type path of the resource type being requested. */
    resource: TypePath;
}

export interface BrpGetResourcesResponse {
    /** The value of the requested resource. */
    value: unknown;
}

export interface BrpInsertResourcesParams {
    /** The full type path of the resource type to insert. */
    resource: TypePath;
    /** The serialized value of the resource to be inserted. */
    value: unknown;
}

export type BrpInsertResourcesResponse = null;

export interface BrpRemoveResourcesParams {
    /** The full type path of the resource type to remove. */
    resource: TypePath;
}

export type BrpRemoveResourcesResponse = null;

export interface BrpMutateResourcesParams {
    /** The full type path of the resource to mutate. */
    resource: TypePath;
    /** The path of the field within the resource. */
    path: string;
    /** The value to insert at `path`. */
    value: unknown;
}

export type BrpMutateResourcesResponse = null;

export type BrpListResourcesParams = undefined;

export type BrpListResourcesResponse = TypePath[];

export interface BrpTriggerEventParams {
    /** The full type path of the event to trigger. */
    event: TypePath;
    /** The serialized value of the event to be triggered, if any. */
    value?: unknown;
}

export type BrpTriggerEventResponse = null;

export type BrpRpcDiscoverParams = undefined;

/** [OpenRPC document](https://spec.open-rpc.org/). */
export type BrpRpcDiscoverResponse = {
    openrpc: string
    info: {
        title: string
        version: string
    }
    methods: {
        name: string
        params: unknown[]
    }[]
}

export type BrpRegistrySchemaParams = {
    /** Exclude types whose crate name matches any of these. */
    without_crates?: string[];
    /** Include only types whose crate name matches any of these. */
    with_crates?: string[];
    type_limit?: {
        /** Exclude types that have any of these reflect types. */
        without?: TypePath[];
        /** Include only types that have all of these reflect types. */
        with?: TypePath[];
    };
};

/** A map of type paths to their JSON Schema definitions for all registered types. */
export type BrpRegistrySchemaResponse = Record<TypePath, object>;


export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly main: (a: number, b: number) => number;
    readonly getBridge: () => any;
    readonly wasm_bindgen__convert__closures_____invoke__h7f5743b555e902e0: (a: number, b: number, c: number, d: number) => any;
    readonly wasm_bindgen__convert__closures_____invoke__hfc650d981c77f0de: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__hc6603a469a472c93: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__haf4338cfb784bc20: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h221a5ce2a7b7713a: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h221a5ce2a7b7713a_3: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h221a5ce2a7b7713a_4: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h221a5ce2a7b7713a_5: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h221a5ce2a7b7713a_6: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h221a5ce2a7b7713a_7: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h221a5ce2a7b7713a_8: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h221a5ce2a7b7713a_9: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__ha0b1751c3f4b0ca6: (a: number, b: number, c: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h78aaa04061365893: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__hf14f5514eab97422: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__hb3652a905020859b: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
