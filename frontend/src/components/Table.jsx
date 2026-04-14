export default function Table({ data }) {
  return (
    <div className="overflow-hidden rounded-2xl shadow-xl">

      <table className="w-full bg-white/5 backdrop-blur-lg">

        <thead className="bg-white/10">
          <tr>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Price</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="border-b border-white/10 hover:bg-white/10">

              <td className="p-3">{item.name}</td>
              <td className="p-3">{item.price}</td>

              <td className="p-3 space-x-2">
                <button className="px-3 py-1 bg-gold text-black rounded">Edit</button>
                <button className="px-3 py-1 bg-red-500 rounded text-white">Delete</button>
              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}