using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace IronDust.Tests
{
    public class TankRigTests
    {
        [TestCase("Assets/Imported/tanks/iron_dust_01/iron_dust_01.glb", 12)]
        [TestCase("Assets/Imported/tanks/iron_dust_02/iron_dust_02.glb", 14)]
        public void TankHasMatchingRoadWheelPairsAndCollisionProxy(string path, int expectedWheels)
        {
            var root = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            Assert.IsNotNull(root, path);

            var all = root.GetComponentsInChildren<Transform>(true);
            Assert.IsNotNull(all.FirstOrDefault(t => t.name == "COL_Hull"), "COL_Hull");
            Assert.IsNotNull(all.FirstOrDefault(t => t.name == "TurretPivot"), "TurretPivot");
            Assert.IsNotNull(all.FirstOrDefault(t => t.name == "GunPitchPivot"), "GunPitchPivot");
            Assert.IsNotNull(all.FirstOrDefault(t => t.name == "MuzzlePoint"), "MuzzlePoint");

            var wheels = all.Where(t => System.Text.RegularExpressions.Regex.IsMatch(t.name, @"^(Left|Right)_RoadWheel_\d\d$")).ToArray();
            Assert.AreEqual(expectedWheels, wheels.Length);

            // Metres, glTF +Z forward: the muzzle sits ahead of the hull centre and the hull is tank-sized.
            var hull = all.First(t => t.name == "COL_Hull").GetComponent<MeshFilter>().sharedMesh.bounds.size;
            Assert.That(Mathf.Max(hull.x, hull.y, hull.z), Is.InRange(5f, 12f), "hull length in metres");
            var muzzle = all.First(t => t.name == "MuzzlePoint");
            Assert.Greater(root.transform.InverseTransformPoint(muzzle.position).z, 0f, "muzzle forward +Z");
        }
    }
}
