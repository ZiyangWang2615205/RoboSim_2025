import * as THREE from "three";

export function addFloor(scene: THREE.Scene, width: number, height: number, depth: number, isMainPage: boolean = false) {
    // add the dark floor if on the Main Page
    // add the quadrant floor if on the Playground
        
    if (isMainPage) {
    
        // Create floor
        let dark_material = new THREE.MeshStandardMaterial({
            color: 0x6D6E6F,
            side: THREE.DoubleSide,
        });

        let geometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
        const plane = new THREE.Mesh(geometry, dark_material);

        // floor only recieves shadows if we are on the main page
        plane.receiveShadow = true;
        scene.add(plane);

        // The plane is slightly below the origin so that it doesn't clip with the cubes

        // x and z values set this way due to technical origin (to accomodate for cube width)
        // being (-0.5, -0.5, 0.5)
        plane.position.set(-0.5, -0.51, 0.5);
    
        // Rotate the plane so that it is horizontal
        plane.rotation.x = Math.PI / 2;
    } else {
        let light_material = new THREE.MeshStandardMaterial({
            color: 0xD3D3D3,
            side: THREE.DoubleSide,
        });

        let medium_material = new THREE.MeshStandardMaterial({
            color: 0x9E9E9E,
            side: THREE.DoubleSide,
        });

        let dark_material = new THREE.MeshStandardMaterial({
            color: 0x6D6E6F,
            side: THREE.DoubleSide,
        });

        const gridHelper = new THREE.GridHelper(2000, 2000, new THREE.Color(0x444444), new THREE.Color("#909090"));
        scene.add(gridHelper);
        gridHelper.position.set(-0.5, -0.5, 0.5);

        // create axes
        const axes = new THREE.AxesHelper(1000);
        scene.add(axes);
        axes.position.set(-0.51, -0.49, 0.51);
        axes.scale.z = -1;  // weird but don't want to change this

        // warehouse borders have 0.01 offset to prevent cubes at the edge of the warehouse space from 'clipping' the borders 

        const borderMaterial = new THREE.LineBasicMaterial( { color: 0xFF6F00 } );

        const floorBorderPoints = [
            new THREE.Vector3(-0.51, -0.49, 0.49 - depth), 
            new THREE.Vector3(width - 0.49, -0.49, 0.49 - depth), 
            new THREE.Vector3(width - 0.49, -0.49, 0.51)
        ];
        const borderGeometry = new THREE.BufferGeometry().setFromPoints(floorBorderPoints);
        const floorBorder = new THREE.Line(borderGeometry, borderMaterial);
        scene.add(floorBorder);

        const ceilingPoints = [
            new THREE.Vector3(-0.51, height - 0.49, 0.51),
            new THREE.Vector3(-0.51, height - 0.49, 0.49 - depth),
            new THREE.Vector3(width - 0.49, height - 0.49, 0.49 - depth),
            new THREE.Vector3(width - 0.49, height - 0.49, 0.51),
            new THREE.Vector3(-0.51, height - 0.49, 0.51)
        ];
        const ceilingGeometry = new THREE.BufferGeometry().setFromPoints(ceilingPoints);
        const ceiling = new THREE.Line(ceilingGeometry, borderMaterial);
        scene.add(ceiling);

        const cornerBorderPoints1 = [floorBorderPoints[0], ceilingPoints[1]];
        const cornerBorderGeometry1 = new THREE.BufferGeometry().setFromPoints(cornerBorderPoints1);
        const cornerBorder1 = new THREE.Line(cornerBorderGeometry1, borderMaterial);
        scene.add(cornerBorder1);

        const cornerBorderPoints2 = [floorBorderPoints[1], ceilingPoints[2]];
        const cornerBorderGeometry2 = new THREE.BufferGeometry().setFromPoints(cornerBorderPoints2);
        const cornerBorder2 = new THREE.Line(cornerBorderGeometry2, borderMaterial);
        scene.add(cornerBorder2);

        const cornerBorderPoints3 = [floorBorderPoints[2], ceilingPoints[3]];
        const cornerBorderGeometry3 = new THREE.BufferGeometry().setFromPoints(cornerBorderPoints3);
        const cornerBorder3 = new THREE.Line(cornerBorderGeometry3, borderMaterial);
        scene.add(cornerBorder3);

        let geometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
        let pgGeometry = new THREE.PlaneGeometry(width, depth, 1, 1);
        const plane1 = new THREE.Mesh(geometry, medium_material);
        const plane2 = new THREE.Mesh(geometry, dark_material);
        const plane3 = new THREE.Mesh(geometry, dark_material);
        const plane4 = new THREE.Mesh(geometry, dark_material);
        const pgPlane = new THREE.Mesh(pgGeometry, light_material);

        scene.add(plane1);
        scene.add(plane2);
        scene.add(plane3);
        scene.add(plane4);

    
        // The plane is slightly below the origin so that it doesn't clip with the cubes
        // Origin: (-0.5, -0.5, 0.5)
        plane1.position.set(499.5, -0.51, -499.5); // +x, -z
        plane2.position.set(499.5, -0.51, 500.5); // +x, +z
        plane3.position.set(-500.5, -0.51, 500.5); // -x, +z
        plane4.position.set(-500.5, -0.51, -499.5); // -x, -z
        pgPlane.position.set((width - 1) / 2, -0.505, (1 - depth) / 2); // 0.005 above to avoid clipping
    
        // Rotate the planes so that they are horizontal
        plane1.rotation.x = Math.PI / 2;
        plane2.rotation.x = Math.PI / 2;
        plane3.rotation.x = Math.PI / 2;
        plane4.rotation.x = Math.PI / 2;
        pgPlane.rotation.x = Math.PI / 2;
        scene.add(pgPlane);
    } 
}
