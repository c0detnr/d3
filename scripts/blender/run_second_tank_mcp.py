"""Run a saved production stage through the official Blender MCP stdio server.
Requires the existing blender-mcp Python environment and a dedicated bridge on 9877.
"""
import argparse, asyncio, json, os
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('stage',choices=['summary','blockout','running_gear','detail','polish','export','validate','render'])
    parser.add_argument('--view',default='three_quarter',choices=['front','side','top','rear','three_quarter','detail','comparison'])
    parser.add_argument('--blockout',action='store_true')
    parser.add_argument('--port',default='9877')
    args=parser.parse_args()
    folder=Path(__file__).resolve().parent
    if args.stage=='summary':tool='get_blendfile_summary_datablocks';params={}
    else:
        script='validate_second_tank.py' if args.stage=='validate' else 'render_second_tank.py' if args.stage=='render' else 'build_second_tank.py'
        code=f'STAGE={args.stage!r}\nVIEW={args.view!r}\nBLOCKOUT={args.blockout!r}\n'+(folder/script).read_text()
        tool='execute_blender_code';params={'code':code}
    env=dict(os.environ,BLENDER_MCP_PORT=args.port)
    async with stdio_client(StdioServerParameters(command='blender-mcp',env=env)) as (read,write):
        async with ClientSession(read,write) as session:
            await session.initialize()
            response=await session.call_tool(tool,params)
            payload=response.structuredContent
            if payload is None:payload=json.loads(response.content[0].text)
            print(json.dumps(payload,indent=2))
            if response.isError or payload.get('status')=='error':raise SystemExit(1)
if __name__=='__main__':asyncio.run(main())
