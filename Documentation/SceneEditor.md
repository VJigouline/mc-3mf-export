# Using it in SceneEditor

[SceneEditor](https://github.com/VJigouline/SceneEditor) saves scenes with mc-3mf-export from the **Scene** tab: choose the format under **Select output format**, then **Save Scene**. The **3MF for 3D printing (3mf, mm)** format writes the visible meshes with their colours, which slicers such as PrusaSlicer, Cura and Bambu Studio open.

The transform gizmo and light helpers are left out. Warnings, such as objects the format can't hold, go to the browser console, and a scene that can't be saved gives a **Failure** message.
