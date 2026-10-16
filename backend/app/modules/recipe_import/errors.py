class RecipeImportError(Exception):
    pass


class UnsupportedUrlError(RecipeImportError):
    pass


class VideoDownloadError(RecipeImportError):
    pass


class VideoTooLongError(RecipeImportError):
    pass


class NoRecipeFoundError(RecipeImportError):
    pass
