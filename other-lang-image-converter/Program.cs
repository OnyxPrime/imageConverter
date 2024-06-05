using GemBox.Imaging;

ComponentInfo.SetLicense("FREE-LIMITED-KEY");

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapPost("/convertpngtojpg", (IFormFile myFile) =>
{
    using (var image = Image.Load(myFile.OpenReadStream()))
    {
        var stream = new MemoryStream();
        image.Save(stream, ImageFileFormat.Jpeg);
        stream.Position = 0;
        var idx = myFile.FileName.LastIndexOf('.');
        var newFileName = $"{myFile.FileName[..idx]}.jpg";
        return Results.File(stream, "image/jpeg", newFileName);
    }
})
.WithName("ConvertPNGtoJPG")
.DisableAntiforgery();

app.Run();