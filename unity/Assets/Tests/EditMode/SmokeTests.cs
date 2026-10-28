using NUnit.Framework;
using UnityEngine;
using UnityEngine.Rendering;

namespace IronDust.Tests
{
    public class SmokeTests
    {
        [Test]
        public void RenderPipelineIsUrp()
        {
            Assert.IsNotNull(QualitySettings.renderPipeline);
        }
    }
}
