use bevy::math::ops::cos;
use bevy::prelude::*;
use bevy_remote::{BrpError, BrpResult, RemotePlugin};
use serde::Serialize;
use serde_json::Value;

fn main() {
    let mut app = App::new();
    app.add_plugins(DefaultPlugins.set(WindowPlugin {
        primary_window: Some(Window {
            canvas: Some("#bevy-canvas".to_string()),
            ..Default::default()
        }),
        ..Default::default()
    }))
    .add_plugins(RemotePlugin::default().with_method("my_custom_method", handler));
    #[cfg(target_family = "wasm")]
    app.add_plugins(bevy_remote_wasm::RemoteWasmPlugin);

    app.insert_resource(UiScale(1.0))
        .add_systems(
            Startup,
            (setup_scene, setup_example_queries, setup_ui).chain(),
        )
        .add_systems(Update, (move_cube, update_ui_scale))
        .run();
}

#[derive(Serialize)]
struct ExampleQuery {
    method: String,
    parameters: Value,
}

#[derive(Resource, Serialize)]
#[serde(transparent)]
struct ExampleQueries {
    queries: Vec<ExampleQuery>,
}

fn handler(In(_params): In<Option<Value>>, world: &mut World) -> BrpResult {
    let example_queries = world.resource::<ExampleQueries>();
    serde_json::to_value(example_queries).map_err(BrpError::resource_error)
}

#[derive(Component, Reflect)]
#[reflect(Component)]
struct Cube;

fn setup_scene(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    commands.insert_resource(ClearColor(Color::BLACK));
    // circular base
    commands.spawn((
        Mesh3d(meshes.add(Circle::new(4.0))),
        MeshMaterial3d(materials.add(Color::WHITE)),
        Transform::from_rotation(Quat::from_rotation_x(-std::f32::consts::FRAC_PI_2)),
    ));

    // cube
    commands.spawn((
        Mesh3d(meshes.add(Cuboid::new(1.0, 1.0, 1.0))),
        MeshMaterial3d(materials.add(Color::srgb_u8(124, 144, 255))),
        Transform::from_xyz(0.0, 0.5, 0.0),
        Cube,
    ));

    // light
    commands.spawn((
        PointLight {
            shadows_enabled: true,
            ..default()
        },
        Transform::from_xyz(4.0, 8.0, 4.0),
    ));

    // camera
    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(-2.5, 4.5, 9.0).looking_at(Vec3::ZERO, Vec3::Y),
    ));
}

fn setup_example_queries(mut commands: Commands, cube_entities: Query<Entity, With<Cube>>) {
    let Ok(cube_entity) = cube_entities.single() else {
        return;
    };
    let cube_id: u64 = cube_entity.to_bits();
    commands.insert_resource(ExampleQueries {
        queries: vec![
            ExampleQuery {
                method: "my_custom_method".to_string(),
                parameters: Value::Null,
            },
            ExampleQuery {
                method: "world.query".to_string(),
                parameters: serde_json::json!({ "data": { "option": "all" } }),
            },
            ExampleQuery {
                method: "world.get_components+watch".to_string(),
                parameters: serde_json::json!({
                    "entity": cube_id,
                    "components": ["bevy_transform::components::transform::Transform"]
                }),
            },
        ],
    });
}

fn setup_ui(mut commands: Commands, examples_queries: Res<ExampleQueries>) {
    let panel_node = Node {
        position_type: PositionType::Absolute,
        top: Val::Px(16.0),
        left: Val::Px(16.0),
        width: Val::Px(700.0),
        max_width: Val::Percent(100.0),
        padding: UiRect::all(Val::Px(12.0)),
        flex_direction: FlexDirection::Column,
        row_gap: Val::Px(18.0),
        ..default()
    };
    let query_node = Node {
        flex_direction: FlexDirection::Column,
        row_gap: Val::Px(6.0),
        ..default()
    };
    let no_wrap = TextLayout::new_with_no_wrap();
    let text_font = TextFont {
        font_size: 18.0,
        ..default()
    };
    let label_color = TextColor(Color::srgb(0.65, 0.65, 0.65));
    let value_color = TextColor(Color::WHITE);

    // UI
    #[allow(clippy::clone_on_copy)]
    commands
        .spawn((Name::new("UI"), panel_node))
        .with_children(|parent| {
            parent.spawn((Text::new("Try these BRP queries"), text_font.clone()));

            for example_query in &examples_queries.queries {
                let parameters = serde_json::to_string_pretty(&example_query.parameters)
                    .expect("example query parameters should serialize");

                parent.spawn((query_node.clone(),)).with_children(|query| {
                    query
                        .spawn((
                            Text::new("Method "),
                            text_font.clone(),
                            label_color.clone(),
                            no_wrap.clone(),
                        ))
                        .with_children(|line| {
                            line.spawn((
                                TextSpan::new(example_query.method.clone()),
                                text_font.clone(),
                                value_color.clone(),
                            ));
                        });
                    query
                        .spawn((
                            Text::new("Parameters "),
                            text_font.clone(),
                            label_color.clone(),
                            no_wrap.clone(),
                        ))
                        .with_children(|line| {
                            line.spawn((
                                TextSpan::new(parameters.clone()),
                                text_font.clone(),
                                value_color.clone(),
                            ));
                        });
                });
            }
        });
}

fn update_ui_scale(window: Single<&Window>, mut ui_scale: ResMut<UiScale>) {
    let scale = (window.resolution.width() / 1200.0).clamp(0.5, 2.0);

    ui_scale.0 = scale;
}

fn move_cube(mut query: Query<&mut Transform, With<Cube>>, time: Res<Time>) {
    for mut transform in &mut query {
        transform.translation.y = -cos(time.elapsed_secs()) + 1.5;
    }
}
